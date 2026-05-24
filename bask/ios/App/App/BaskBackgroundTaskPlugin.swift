import Foundation
import Capacitor
import BackgroundTasks

@objc(BaskBackgroundTaskPlugin)
public class BaskBackgroundTaskPlugin: CAPPlugin {

    // Task identifiers (must match Info.plist)
    private static let weatherRefreshTaskId = "io.bask.weatherRefresh"
    private static let notificationUpdateTaskId = "io.bask.notificationUpdate"

    // Note: Background task handlers are registered in AppDelegate.swift
    // This plugin only exposes methods to schedule tasks from JavaScript

    // MARK: - Capacitor Methods

    @objc func scheduleBackgroundRefresh(_ call: CAPPluginCall) {
        // Schedule a background refresh for weather data
        let request = BGAppRefreshTaskRequest(identifier: BaskBackgroundTaskPlugin.weatherRefreshTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60) // 1 hour from now

        do {
            try BGTaskScheduler.shared.submit(request)
            call.resolve(["scheduled": true])
        } catch {
            call.reject("Failed to schedule background refresh: \(error.localizedDescription)")
        }
    }

    @objc func cancelAllBackgroundTasks(_ call: CAPPluginCall) {
        BGTaskScheduler.shared.cancelAllTaskRequests()
        call.resolve(["cancelled": true])
    }

    @objc func getBackgroundRefreshStatus(_ call: CAPPluginCall) {
        // Check if background refresh is enabled
        let status = UIApplication.shared.backgroundRefreshStatus
        var statusString: String

        switch status {
        case .available:
            statusString = "available"
        case .denied:
            statusString = "denied"
        case .restricted:
            statusString = "restricted"
        @unknown default:
            statusString = "unknown"
        }

        call.resolve(["status": statusString])
    }

}
