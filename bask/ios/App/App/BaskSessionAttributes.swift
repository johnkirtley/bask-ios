//
//  BaskSessionAttributes.swift
//  Bask
//
//  Shared ActivityAttributes for Live Activities
//  Used by both the main App target and BaskWidgetExtension target
//

import Foundation
import ActivityKit

@available(iOS 16.1, *)
struct BaskSessionAttributes: ActivityAttributes {
    // Static attributes - set once when Live Activity starts, cannot be updated
    public struct ContentState: Codable, Hashable {
        // Dynamic state - can be updated throughout the session
        var currentIU: Int              // Vitamin D IU accumulated so far
        var isPaused: Bool              // Whether session is paused
        var effectiveStartDate: Date    // Adjusted start time (shifts forward on resume to account for pause duration)
        var elapsedSecondsAtPause: Int  // Frozen elapsed time when paused (0 when active)
    }

    // Static data - captured once at session start
    let uvIndex: Double             // UV index at session start
    let timeToBurnMinutes: Int      // Minutes until sunburn risk
    let sessionStartDate: Date      // Original wall-clock start time
}
