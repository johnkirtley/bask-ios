#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BaskHealthPlugin, "BaskHealth",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getTimeInDaylight, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDietaryVitaminD, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(writeDietaryVitaminD, CAPPluginReturnPromise);
)
