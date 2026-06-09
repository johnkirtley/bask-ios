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
    // Which phase of the session the widget should present.
    // morningLight: pre-synthesis (UV < 3) — show the timer, not "0 IU".
    // vitaminD: synthesizing (UV >= 3) — show accumulated IU. Sticky once reached.
    public enum SynthesisPhase: String, Codable, Hashable {
        case morningLight
        case vitaminD
    }

    // Static attributes - set once when Live Activity starts, cannot be updated
    public struct ContentState: Codable, Hashable {
        // Dynamic state - can be updated throughout the session
        var currentIU: Int              // Vitamin D IU accumulated so far
        var isPaused: Bool              // Whether session is paused
        var canAccessSunburnRisk: Bool  // Whether burn timing can be displayed
        var effectiveStartDate: Date    // Adjusted start time (shifts forward on resume to account for pause duration)
        var elapsedSecondsAtPause: Int  // Frozen elapsed time when paused (0 when active)
        var phase: SynthesisPhase = .vitaminD  // Morning light vs vitamin D presentation
    }

    // Static data - captured once at session start
    let uvIndex: Double             // UV index at session start
    let timeToBurnMinutes: Int      // Minutes until sunburn risk
    let sessionStartDate: Date      // Original wall-clock start time
}
