//
//  BaskLiveActivityWidget.swift
//  BaskWidgetExtension
//
//  Live Activity views for Lock Screen and Dynamic Island
//

import SwiftUI
import ActivityKit
import WidgetKit

// Format burn time as hours+minutes when >= 60 minutes
private func formatBurnTime(_ minutes: Int) -> String {
    if minutes >= 60 {
        let hours = minutes / 60
        let mins = minutes % 60
        return "\(hours)h \(mins)m"
    }
    return "\(minutes)m"
}

private func burnTimingText(_ context: ActivityViewContext<BaskSessionAttributes>) -> String {
    return context.state.canAccessSunburnRisk
        ? "\(formatBurnTime(context.attributes.timeToBurnMinutes)) to burn"
        : "Burn timing Pro"
}

private func burnTimingBottomText(_ context: ActivityViewContext<BaskSessionAttributes>) -> String {
    return context.state.canAccessSunburnRisk
        ? "\(formatBurnTime(context.attributes.timeToBurnMinutes)) before sunburn"
        : "Burn timing unlocks with Pro"
}

@available(iOS 16.1, *)
struct BaskLiveActivityView: View {
    let context: ActivityViewContext<BaskSessionAttributes>

    var body: some View {
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

                // UV index and burn time
                Text("UV \(String(format: "%.1f", context.attributes.uvIndex)) · \(burnTimingText(context))")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
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
                    Text(burnTimingBottomText(context))
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
