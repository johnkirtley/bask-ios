import Foundation
import Capacitor
import HealthKit

@objc(BaskHealthPlugin)
public class BaskHealthPlugin: CAPPlugin {
    private var healthStore: HKHealthStore?

    public override func load() {
        // Initialize HealthKit store
        if HKHealthStore.isHealthDataAvailable() {
            healthStore = HKHealthStore()
        }
    }

    // MARK: - Availability Check

    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        call.resolve([
            "available": available
        ])
    }

    // MARK: - Authorization

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard let healthStore = healthStore else {
            call.reject("HealthKit is not available on this device")
            return
        }

        // Define the health data types we want to access
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .dietaryVitaminD)!,
            HKQuantityType.quantityType(forIdentifier: .appleStandTime)!, // For outdoor time proxy
        ]

        let typesToWrite: Set<HKSampleType> = [
            HKQuantityType.quantityType(forIdentifier: .dietaryVitaminD)!
        ]

        // Add timeInDaylight for iOS 17+
        var readTypes = typesToRead
        if #available(iOS 17.0, *) {
            if let timeInDaylight = HKQuantityType.quantityType(forIdentifier: .timeInDaylight) {
                readTypes.insert(timeInDaylight)
            }
        }

        healthStore.requestAuthorization(toShare: typesToWrite, read: readTypes) { success, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
                return
            }

            call.resolve([
                "authorized": success
            ])
        }
    }

    // MARK: - Time in Daylight (iOS 17+)

    @objc func getTimeInDaylight(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("Time in Daylight requires iOS 17.0 or later")
            return
        }

        guard let healthStore = healthStore else {
            call.reject("HealthKit is not available")
            return
        }

        guard let timeInDaylightType = HKQuantityType.quantityType(forIdentifier: .timeInDaylight) else {
            call.reject("Time in Daylight type not available")
            return
        }

        // Get date range from parameters or default to today
        let startDateString = call.getString("startDate")
        let endDateString = call.getString("endDate")

        let calendar = Calendar.current
        let startDate: Date
        let endDate: Date

        if let startString = startDateString, let start = ISO8601DateFormatter().date(from: startString) {
            startDate = start
        } else {
            startDate = calendar.startOfDay(for: Date())
        }

        if let endString = endDateString, let end = ISO8601DateFormatter().date(from: endString) {
            endDate = end
        } else {
            endDate = Date()
        }

        // Create a query to get cumulative sum
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)

        let query = HKStatisticsQuery(
            quantityType: timeInDaylightType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            if let error = error {
                call.reject("Failed to fetch time in daylight: \(error.localizedDescription)")
                return
            }

            guard let result = result, let sum = result.sumQuantity() else {
                call.resolve([
                    "minutes": 0
                ])
                return
            }

            let minutes = sum.doubleValue(for: HKUnit.minute())

            call.resolve([
                "minutes": minutes,
                "startDate": ISO8601DateFormatter().string(from: startDate),
                "endDate": ISO8601DateFormatter().string(from: endDate)
            ])
        }

        healthStore.execute(query)
    }

    // MARK: - Dietary Vitamin D (Read)

    @objc func getDietaryVitaminD(_ call: CAPPluginCall) {
        guard let healthStore = healthStore else {
            call.reject("HealthKit is not available")
            return
        }

        guard let vitaminDType = HKQuantityType.quantityType(forIdentifier: .dietaryVitaminD) else {
            call.reject("Dietary Vitamin D type not available")
            return
        }

        // Get date range from parameters or default to today
        let startDateString = call.getString("startDate")
        let endDateString = call.getString("endDate")

        let calendar = Calendar.current
        let startDate: Date
        let endDate: Date

        if let startString = startDateString, let start = ISO8601DateFormatter().date(from: startString) {
            startDate = start
        } else {
            startDate = calendar.startOfDay(for: Date())
        }

        if let endString = endDateString, let end = ISO8601DateFormatter().date(from: endString) {
            endDate = end
        } else {
            endDate = Date()
        }

        // Create a query to get cumulative sum
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)

        let query = HKStatisticsQuery(
            quantityType: vitaminDType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            if let error = error {
                call.reject("Failed to fetch vitamin D: \(error.localizedDescription)")
                return
            }

            guard let result = result, let sum = result.sumQuantity() else {
                call.resolve([
                    "iu": 0
                ])
                return
            }

            // HealthKit stores vitamin D in micrograms, convert to IU
            // 1 mcg = 40 IU
            let micrograms = sum.doubleValue(for: HKUnit.gramUnit(with: .micro))
            let iu = micrograms * 40.0

            call.resolve([
                "iu": iu,
                "startDate": ISO8601DateFormatter().string(from: startDate),
                "endDate": ISO8601DateFormatter().string(from: endDate)
            ])
        }

        healthStore.execute(query)
    }

    // MARK: - Dietary Vitamin D (Write)

    @objc func writeDietaryVitaminD(_ call: CAPPluginCall) {
        guard let healthStore = healthStore else {
            call.reject("HealthKit is not available")
            return
        }

        guard let vitaminDType = HKQuantityType.quantityType(forIdentifier: .dietaryVitaminD) else {
            call.reject("Dietary Vitamin D type not available")
            return
        }

        guard let dosageIU = call.getDouble("dosageIU") else {
            call.reject("Missing required parameter: dosageIU")
            return
        }

        // Get date from parameter or use current time
        let dateString = call.getString("date")
        let date: Date
        if let dateStr = dateString, let parsedDate = ISO8601DateFormatter().date(from: dateStr) {
            date = parsedDate
        } else {
            date = Date()
        }

        // Convert IU to micrograms (1 IU = 0.025 mcg)
        let micrograms = dosageIU * 0.025
        let quantity = HKQuantity(unit: HKUnit.gramUnit(with: .micro), doubleValue: micrograms)

        // Create the sample
        let sample = HKQuantitySample(
            type: vitaminDType,
            quantity: quantity,
            start: date,
            end: date
        )

        // Save to HealthKit
        healthStore.save(sample) { success, error in
            if let error = error {
                call.reject("Failed to write vitamin D: \(error.localizedDescription)")
                return
            }

            call.resolve([
                "success": success,
                "iu": dosageIU,
                "date": ISO8601DateFormatter().string(from: date)
            ])
        }
    }

}
