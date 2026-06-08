//
//  BaskLiveActivityWidget.swift
//  BaskWidgetExtension
//
//  Live Activity views for Lock Screen and Dynamic Island
//

import SwiftUI
import ActivityKit
import WidgetKit

// Wall-clock moment the session reaches sunburn risk (1 MED).
// Derived from effectiveStartDate (which shifts forward on resume) + the
// constant time-to-burn, so it stays perfectly in sync with the in-app
// countdown without any push updates.
private func sunburnTargetDate(_ context: ActivityViewContext<BaskSessionAttributes>) -> Date {
    return context.state.effectiveStartDate
        .addingTimeInterval(Double(context.attributes.timeToBurnMinutes * 60))
}

// Format a frozen remaining duration as the same timer string the native
// countdown uses: mm:ss, and h:mm:ss once >= 1 hour.
private func formatCountdown(_ seconds: Int) -> String {
    let clamped = max(0, seconds)
    let hours = clamped / 3600
    let mins = (clamped % 3600) / 60
    let secs = clamped % 60
    if hours > 0 {
        return String(format: "%d:%02d:%02d", hours, mins, secs)
    }
    return String(format: "%d:%02d", mins, secs)
}

// Live "Time Until Sunburn" row. The countdown updates natively on the Lock
// Screen / Dynamic Island even while the app is suspended. Falls back to a
// clear upsell message when the user can't access sunburn risk.
@available(iOS 16.1, *)
@ViewBuilder
private func sunburnRow(_ context: ActivityViewContext<BaskSessionAttributes>) -> some View {
    if !context.state.canAccessSunburnRisk {
        HStack(spacing: 4) {
            Image(systemName: "lock.fill")
            Text("Unlock sunburn timing")
        }
    } else {
        HStack(spacing: 4) {
            Text("Time Until Sunburn")
            Text("·")
            sunburnValue(context)
                .monospacedDigit()
        }
    }
}

// The countdown value itself (Pro users only — gating handled by sunburnRow).
@available(iOS 16.1, *)
@ViewBuilder
private func sunburnValue(_ context: ActivityViewContext<BaskSessionAttributes>) -> some View {
    if context.state.isPaused {
        // Frozen remaining while paused: total MED minus elapsed-at-pause.
        Text(formatCountdown(
            context.attributes.timeToBurnMinutes * 60 - context.state.elapsedSecondsAtPause
        ))
    } else {
        let target = sunburnTargetDate(context)
        if target > Date() {
            // Native countdown — auto-updates, clamps at 0:00, shows hours when >= 1h.
            Text(timerInterval: Date()...target, countsDown: true)
        } else {
            Text("Now")
        }
    }
}

@available(iOS 16.1, *)
struct BaskLiveActivityView: View {
    let context: ActivityViewContext<BaskSessionAttributes>

    var body: some View {
        VStack(spacing: 6) {
        HStack(spacing: 10) {
            // Sun icon with glow effect
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: context.state.isPaused ?
                                [Color.orange.opacity(0.3), Color.clear] :
                                [Color.orange.opacity(0.5), Color.orange.opacity(0.1)],
                            center: .center,
                            startRadius: 0,
                            endRadius: 16
                        )
                    )
                    .frame(width: 32, height: 32)

                Image(systemName: "sun.max.fill")
                    .font(.system(size: 20))
                    .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)
            }

            VStack(alignment: .leading, spacing: 1) {
                // Status label
                Text(context.state.isPaused ? "Paused" : "Basking")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)

                // Timer - auto-updates natively
                if context.state.isPaused {
                    Text(formatElapsedTime(context.state.elapsedSecondsAtPause))
                        .font(.title3)
                        .fontWeight(.bold)
                        .monospacedDigit()
                } else {
                    Text(context.state.effectiveStartDate, style: .timer)
                        .font(.title3)
                        .fontWeight(.bold)
                        .monospacedDigit()
                }
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 1) {
                // IU accumulated
                Text("\(context.state.currentIU) IU")
                    .font(.headline)
                    .foregroundColor(.orange)

                // UV index
                Text("UV \(String(format: "%.1f", context.attributes.uvIndex))")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }

            // Time Until Sunburn — native countdown, stays live while locked
            sunburnRow(context)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .activityBackgroundTint(Color.black.opacity(0.1))
    }

    private func formatElapsedTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}

@available(iOS 16.1, *)
struct BaskLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BaskSessionAttributes.self) { context in
            // Lock Screen / Banner
            BaskLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: "sun.max.fill")
                            .font(.system(size: 22))
                            .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)

                        VStack(alignment: .leading, spacing: 1) {
                            Text(context.state.isPaused ? "Paused" : "Basking")
                                .font(.caption2)
                                .foregroundColor(.secondary)

                            if context.state.isPaused {
                                Text(formatElapsedTime(context.state.elapsedSecondsAtPause))
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .monospacedDigit()
                            } else {
                                Text(context.state.effectiveStartDate, style: .timer)
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .monospacedDigit()
                            }
                        }
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("\(context.state.currentIU) IU")
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundColor(.orange)

                        Text("UV \(String(format: "%.1f", context.attributes.uvIndex))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    sunburnRow(context)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            } compactLeading: {
                // Compact leading (small icon on left)
                Image(systemName: "sun.max.fill")
                    .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)
            } compactTrailing: {
                // Compact trailing (timer only) — fixed width so the
                // `.timer` style doesn't reserve space for hours and
                // stretch the whole pill.
                Group {
                    if context.state.isPaused {
                        Text(formatElapsedTime(context.state.elapsedSecondsAtPause))
                    } else {
                        Text(context.state.effectiveStartDate, style: .timer)
                    }
                }
                .font(.caption2)
                .fontWeight(.semibold)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .multilineTextAlignment(.trailing)
                .frame(width: 44)
            } minimal: {
                // Minimal (when multiple activities are active)
                Image(systemName: "sun.max.fill")
                    .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)
            }
        }
    }

    private func formatElapsedTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}
