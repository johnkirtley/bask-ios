//
//  BaskLiveActivityPlugin.swift
//  Bask
//
//  Capacitor plugin for managing Live Activities
//  Bridges JavaScript session lifecycle to native ActivityKit APIs
//

import Foundation
import Capacitor
import ActivityKit

@objc(BaskLiveActivityPlugin)
public class BaskLiveActivityPlugin: CAPPlugin {

    private var currentActivityId: String?

    // Map the JS phase string ('morningLight' | 'vitaminD') to the typed enum.
    @available(iOS 16.1, *)
    private func parsePhase(_ call: CAPPluginCall) -> BaskSessionAttributes.SynthesisPhase {
        return call.getString("phase") == "morningLight" ? .morningLight : .vitaminD
    }

    // MARK: - Check Availability

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve([
                "supported": ActivityAuthorizationInfo().areActivitiesEnabled
            ])
        } else {
            call.resolve([
                "supported": false
            ])
        }
    }

    // MARK: - Start Live Activity

    @objc func startActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2 or later")
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are disabled by the user")
            return
        }

        guard let uvIndex = call.getDouble("uvIndex"),
              let timeToBurnMinutesDouble = call.getDouble("timeToBurnMinutes"),
              let startTimeMs = call.getDouble("startTimeMs") else {
            call.reject("Missing required parameters: uvIndex, timeToBurnMinutes, startTimeMs")
            return
        }

        let timeToBurnMinutes = Int(timeToBurnMinutesDouble)
        let canAccessSunburnRisk = call.getBool("canAccessSunburnRisk") ?? true

        let startDate = Date(timeIntervalSince1970: startTimeMs / 1000.0)

        let attributes = BaskSessionAttributes(
            uvIndex: uvIndex,
            timeToBurnMinutes: timeToBurnMinutes,
            sessionStartDate: startDate
        )

        let initialState = BaskSessionAttributes.ContentState(
            currentIU: 0,
            isPaused: false,
            canAccessSunburnRisk: canAccessSunburnRisk,
            effectiveStartDate: startDate,
            elapsedSecondsAtPause: 0,
            phase: parsePhase(call)
        )

        let content = ActivityContent(state: initialState, staleDate: nil)

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: content,
                pushType: nil  // No push-based updates; app drives updates
            )
            currentActivityId = activity.id
            call.resolve([
                "activityId": activity.id
            ])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    // MARK: - Update Live Activity

    @objc func updateActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2 or later")
            return
        }

        guard let activityId = call.getString("activityId") ?? currentActivityId else {
            call.reject("No active Live Activity found")
            return
        }

        guard let currentIUDouble = call.getDouble("currentIU"),
              let isPaused = call.getBool("isPaused"),
              let effectiveStartTimeMs = call.getDouble("effectiveStartTimeMs"),
              let elapsedSecondsAtPauseDouble = call.getDouble("elapsedSecondsAtPause") else {
            call.reject("Missing required parameters")
            return
        }

        let currentIU = Int(currentIUDouble)
        let elapsedSecondsAtPause = Int(elapsedSecondsAtPauseDouble)
        let canAccessSunburnRisk = call.getBool("canAccessSunburnRisk") ?? true

        let effectiveStartDate = Date(timeIntervalSince1970: effectiveStartTimeMs / 1000.0)

        let updatedState = BaskSessionAttributes.ContentState(
            currentIU: currentIU,
            isPaused: isPaused,
            canAccessSunburnRisk: canAccessSunburnRisk,
            effectiveStartDate: effectiveStartDate,
            elapsedSecondsAtPause: elapsedSecondsAtPause,
            phase: parsePhase(call)
        )

        let content = ActivityContent(state: updatedState, staleDate: nil)

        // Find the activity by ID and update it
        Task {
            for activity in Activity<BaskSessionAttributes>.activities {
                if activity.id == activityId {
                    await activity.update(content)
                    call.resolve([
                        "updated": true
                    ])
                    return
                }
            }
            call.reject("Activity not found with id: \(activityId)")
        }
    }

    // MARK: - End Live Activity

    @objc func endActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2 or later")
            return
        }

        let activityId = call.getString("activityId") ?? currentActivityId
        let finalIU = Int(call.getDouble("finalIU") ?? 0)

        let finalState = BaskSessionAttributes.ContentState(
            currentIU: finalIU,
            isPaused: true,
            canAccessSunburnRisk: true,
            effectiveStartDate: Date(),
            elapsedSecondsAtPause: 0
        )

        let finalContent = ActivityContent(state: finalState, staleDate: nil)

        Task {
            if let activityId = activityId {
                for activity in Activity<BaskSessionAttributes>.activities {
                    if activity.id == activityId {
                        await activity.end(finalContent, dismissalPolicy: .immediate)
                        self.currentActivityId = nil
                        call.resolve(["ended": true])
                        return
                    }
                }
            }

            // Fallback: end ALL Bask activities
            for activity in Activity<BaskSessionAttributes>.activities {
                await activity.end(finalContent, dismissalPolicy: .immediate)
            }
            self.currentActivityId = nil
            call.resolve(["ended": true])
        }
    }

    // MARK: - End All Activities (cleanup)

    @objc func endAllActivities(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["ended": true])
            return
        }

        let finalState = BaskSessionAttributes.ContentState(
            currentIU: 0,
            isPaused: true,
            canAccessSunburnRisk: true,
            effectiveStartDate: Date(),
            elapsedSecondsAtPause: 0
        )
        let finalContent = ActivityContent(state: finalState, staleDate: nil)

        Task {
            for activity in Activity<BaskSessionAttributes>.activities {
                await activity.end(finalContent, dismissalPolicy: .immediate)
            }
            self.currentActivityId = nil
            call.resolve(["ended": true])
        }
    }
}
