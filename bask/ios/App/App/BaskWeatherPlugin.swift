import Foundation
import Capacitor
import CoreLocation

#if canImport(WeatherKit)
import WeatherKit
#endif

@objc(BaskWeatherPlugin)
public class BaskWeatherPlugin: CAPPlugin, CLLocationManagerDelegate {
    private var locationManager: CLLocationManager?
    private var currentLocation: CLLocation?
    private var weatherCache: [String: (data: Any, timestamp: Date)] = [:]
    private let cacheExpirationMinutes: Double = 10

    private var locationCompletionHandlers: [(Result<CLLocation, Error>) -> Void] = []
    private var pendingPermissionCall: CAPPluginCall?

    public override func load() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    // MARK: - Location Permission

    private func permissionStatusString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "prompt"
        case .authorizedWhenInUse, .authorizedAlways:
            return "granted"
        case .denied, .restricted:
            return "denied"
        @unknown default:
            return "denied"
        }
    }

    @objc func getLocationPermissionStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let status = CLLocationManager.authorizationStatus()
            call.resolve(["status": self.permissionStatusString(status)])
        }
    }

    @objc func requestLocationPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let status = CLLocationManager.authorizationStatus()

            switch status {
            case .notDetermined:
                self.pendingPermissionCall = call
                self.locationManager?.requestWhenInUseAuthorization()
            default:
                call.resolve(["status": self.permissionStatusString(status)])
            }
        }
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        currentLocation = location

        // Resolve all pending completion handlers
        for handler in locationCompletionHandlers {
            handler(.success(location))
        }
        locationCompletionHandlers.removeAll()

        // Stop updating location to save battery
        locationManager?.stopUpdatingLocation()
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Resolve all pending completion handlers with error
        for handler in locationCompletionHandlers {
            handler(.failure(error))
        }
        locationCompletionHandlers.removeAll()
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus

        guard let call = pendingPermissionCall else { return }

        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            pendingPermissionCall = nil
            call.resolve(["status": "granted"])
        case .denied, .restricted:
            pendingPermissionCall = nil
            call.resolve(["status": "denied"])
        case .notDetermined:
            break
        @unknown default:
            pendingPermissionCall = nil
            call.resolve(["status": "denied"])
        }
    }

    // MARK: - Location Helpers

    private func getCurrentLocation(completion: @escaping (Result<CLLocation, Error>) -> Void) {
        // Check authorization status
        let status = CLLocationManager.authorizationStatus()

        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            completion(.failure(NSError(domain: "BaskWeather", code: 1, userInfo: [NSLocalizedDescriptionKey: "Location permission not granted"])))
            return
        }

        // If we have a recent location (less than 5 minutes old), use it
        if let location = currentLocation,
           Date().timeIntervalSince(location.timestamp) < 5 * 60 {
            completion(.success(location))
            return
        }

        // Add completion handler to queue
        locationCompletionHandlers.append(completion)

        // Start updating location if not already updating
        if locationCompletionHandlers.count == 1 {
            DispatchQueue.main.async { [weak self] in
                self?.locationManager?.startUpdatingLocation()
            }
        }

        // Set a timeout for location request
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            guard let self = self else { return }

            // If we still have this completion handler, it timed out
            if let index = self.locationCompletionHandlers.firstIndex(where: { _ in true }) {
                let handler = self.locationCompletionHandlers[index]
                self.locationCompletionHandlers.remove(at: index)
                handler(.failure(NSError(domain: "BaskWeather", code: 2, userInfo: [NSLocalizedDescriptionKey: "Location request timed out"])))
            }
        }
    }

    // MARK: - Weather Methods

    @objc func getCurrentWeather(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("WeatherKit requires iOS 16.0 or later")
            return
        }

        getCurrentLocation { [weak self] result in
            switch result {
            case .success(let location):
                self?.fetchCurrentWeather(location: location, call: call)
            case .failure(let error):
                call.reject("Failed to get location: \(error.localizedDescription)")
            }
        }
    }

    @available(iOS 16.0, *)
    private func fetchCurrentWeather(location: CLLocation, call: CAPPluginCall) {
        let cacheKey = "current_\(location.coordinate.latitude)_\(location.coordinate.longitude)"

        // Check cache
        if let cached = weatherCache[cacheKey],
           Date().timeIntervalSince(cached.timestamp) < cacheExpirationMinutes * 60,
           let data = cached.data as? [String: Any] {
            call.resolve(data)
            return
        }

        Task {
            do {
                let weatherService = WeatherService.shared
                let weather = try await weatherService.weather(for: location)

                let currentWeather = weather.currentWeather

                let result: [String: Any] = [
                    "temperature": currentWeather.temperature.value,
                    "apparentTemperature": currentWeather.apparentTemperature.value,
                    "uvIndex": currentWeather.uvIndex.value,
                    "humidity": currentWeather.humidity,
                    "cloudCover": currentWeather.cloudCover,
                    "condition": currentWeather.condition.rawValue,
                    "symbolName": currentWeather.symbolName,
                    "isDaylight": currentWeather.isDaylight
                ]

                // Cache the result
                self.weatherCache[cacheKey] = (result, Date())

                call.resolve(result)
            } catch {
                call.reject("Failed to fetch weather: \(error.localizedDescription)")
            }
        }
    }

    @objc func getHourlyForecast(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("WeatherKit requires iOS 16.0 or later")
            return
        }

        getCurrentLocation { [weak self] result in
            switch result {
            case .success(let location):
                self?.fetchHourlyForecast(location: location, call: call)
            case .failure(let error):
                call.reject("Failed to get location: \(error.localizedDescription)")
            }
        }
    }

    @available(iOS 16.0, *)
    private func fetchHourlyForecast(location: CLLocation, call: CAPPluginCall) {
        let cacheKey = "hourly_\(location.coordinate.latitude)_\(location.coordinate.longitude)"

        // Check cache
        if let cached = weatherCache[cacheKey],
           Date().timeIntervalSince(cached.timestamp) < cacheExpirationMinutes * 60,
           let data = cached.data as? [[String: Any]] {
            call.resolve(["forecast": data])
            return
        }

        Task {
            do {
                let weatherService = WeatherService.shared

                // Get hourly forecast for next 48 hours
                let startDate = Date()
                let endDate = Calendar.current.date(byAdding: .hour, value: 48, to: startDate) ?? startDate

                let forecast = try await weatherService.weather(
                    for: location,
                    including: .hourly(startDate: startDate, endDate: endDate)
                )

                let hourlyData = forecast.map { hour -> [String: Any] in
                    let calendar = Calendar.current
                    let components = calendar.dateComponents([.hour, .minute], from: hour.date)

                    return [
                        "date": ISO8601DateFormatter().string(from: hour.date),
                        "hour": components.hour ?? 0,
                        "temperature": hour.temperature.value,
                        "uvIndex": hour.uvIndex.value,
                        "cloudCover": hour.cloudCover,
                        "humidity": hour.humidity,
                        "symbolName": hour.symbolName,
                        "condition": hour.condition.rawValue
                    ]
                }

                // Cache the result
                self.weatherCache[cacheKey] = (hourlyData, Date())

                call.resolve(["forecast": hourlyData])
            } catch {
                call.reject("Failed to fetch hourly forecast: \(error.localizedDescription)")
            }
        }
    }

    @objc func getSolarEvents(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("WeatherKit requires iOS 16.0 or later")
            return
        }

        getCurrentLocation { [weak self] result in
            switch result {
            case .success(let location):
                self?.fetchSolarEvents(location: location, call: call)
            case .failure(let error):
                call.reject("Failed to get location: \(error.localizedDescription)")
            }
        }
    }

    @available(iOS 16.0, *)
    private func fetchSolarEvents(location: CLLocation, call: CAPPluginCall) {
        let cacheKey = "solar_\(location.coordinate.latitude)_\(location.coordinate.longitude)"

        // Check cache
        if let cached = weatherCache[cacheKey],
           Date().timeIntervalSince(cached.timestamp) < cacheExpirationMinutes * 60,
           let data = cached.data as? [String: Any] {
            call.resolve(data)
            return
        }

        Task {
            do {
                let weatherService = WeatherService.shared

                // Get daily forecast which includes sun events
                let forecast = try await weatherService.weather(
                    for: location,
                    including: .daily
                )

                // Get today's forecast
                guard let today = forecast.first(where: { Calendar.current.isDateInToday($0.date) }) else {
                    call.reject("No solar data available for today")
                    return
                }

                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "h:mm a"

                var result: [String: Any] = [:]

                if let sunrise = today.sun.sunrise {
                    result["sunrise"] = ISO8601DateFormatter().string(from: sunrise)
                    result["sunriseFormatted"] = dateFormatter.string(from: sunrise)
                }

                if let sunset = today.sun.sunset {
                    result["sunset"] = ISO8601DateFormatter().string(from: sunset)
                    result["sunsetFormatted"] = dateFormatter.string(from: sunset)
                }

                if let solarNoon = today.sun.solarNoon {
                    result["solarNoon"] = ISO8601DateFormatter().string(from: solarNoon)
                }

                if let solarMidnight = today.sun.solarMidnight {
                    result["solarMidnight"] = ISO8601DateFormatter().string(from: solarMidnight)
                }

                // Cache the result
                self.weatherCache[cacheKey] = (result, Date())

                call.resolve(result)
            } catch {
                call.reject("Failed to fetch solar events: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Location Info
    @objc func getLocationInfo(_ call: CAPPluginCall) {
        getCurrentLocation { [weak self] result in
            switch result {
            case .success(let location):
                self?.reverseGeocodeLocation(location: location, call: call)
            case .failure(let error):
                call.reject("Failed to get location: \(error.localizedDescription)")
            }
        }
    }

    private func reverseGeocodeLocation(location: CLLocation, call: CAPPluginCall) {
        let geocoder = CLGeocoder()

        geocoder.reverseGeocodeLocation(location) { placemarks, error in
            if let error = error {
                call.reject("Failed to reverse geocode location: \(error.localizedDescription)")
                return
            }

            guard let placemark = placemarks?.first else {
                call.reject("No placemark found for location")
                return
            }

            let result: [String: Any] = [
                "city": placemark.locality ?? "",
                "state": placemark.administrativeArea ?? "",
                "country": placemark.country ?? "",
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude
            ]

            call.resolve(result)
        }
    }

    // MARK: - App Settings
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Cannot create settings URL")
                return
            }
            UIApplication.shared.open(settingsUrl) { success in
                if success {
                    call.resolve()
                } else {
                    call.reject("Failed to open settings")
                }
            }
        }
    }
}
