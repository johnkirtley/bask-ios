#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BaskBackgroundTaskPlugin, "BaskBackgroundTask",
    CAP_PLUGIN_METHOD(scheduleBackgroundRefresh, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(cancelAllBackgroundTasks, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getBackgroundRefreshStatus, CAPPluginReturnPromise);
)
