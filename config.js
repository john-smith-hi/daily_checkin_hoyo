// Configuration file for the extension
export const CONFIG = {
    // Cookie name to check
    COOKIE_NAME: 'account_id_v2',
    
    // Check-in URL to check cookie
    CHECKIN_URL: 'https://www.hoyolab.com',
    
    // Redirect URL when cookie doesn't exist
    REDIRECT_URL: 'https://www.hoyolab.com/home',
    
    // Check interval in milliseconds (5 minutes)
    CHECK_INTERVAL: 5 * 60 * 1000,

    // per-request fetch timeout in milliseconds
    FETCH_TIMEOUT_MS: 8000,

    GENSHIN_IMPACT_URL_API_CHECKIN: 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=vi-vn',
    GENSHIN_IMPACT_METHOD: 'POST',
    GENSHIN_IMPACT_ACT_ID: 'e202102251931481',
    GENSHIN_IMPACT_VARIABLE_NAME: 'retcode',
    GENSHIN_IMPACT_VARIABLE_VALUE_SUCCESS: 0,
    GENSHIN_IMPACT_VARIABLE_VALUE_CHECKED: -5003,

    HONKAI_STAR_RAIL_URL_API_CHECKIN: 'https://sg-public-api.hoyolab.com/event/luna/hkrpg/os/sign?lang=vi-vn',
    HONKAI_STAR_RAIL_METHOD: 'POST',
    HONKAI_STAR_RAIL_ACT_ID: 'e202303301540311',
    HONKAI_STAR_RAIL_VARIABLE_NAME: 'retcode',
    HONKAI_STAR_RAIL_VARIABLE_VALUE_SUCCESS: 0,
    HONKAI_STAR_RAIL_VARIABLE_VALUE_CHECKED: -5003,

    ZENDLESS_ZONE_ZERO_URL_API_CHECKIN: 'https://sg-public-api.hoyolab.com/event/luna/zzz/os/sign',
    ZENDLESS_ZONE_ZERO_METHOD: 'POST',
    ZENDLESS_ZONE_ZERO_ACT_ID: 'e202406031448091',
    ZENDLESS_ZONE_ZERO_VARIABLE_NAME: 'retcode',
    ZENDLESS_ZONE_ZERO_VARIABLE_VALUE_SUCCESS: 0,
    ZENDLESS_ZONE_ZERO_VARIABLE_VALUE_CHECKED: -500012,

    HONKAI_IMPACT_URL_API_CHECKIN: 'https://sg-public-api.hoyolab.com/event/mani/sign?lang=vi-vn',
    HONKAI_IMPACT_METHOD: 'POST',
    HONKAI_IMPACT_ACT_ID: 'e202110291205111',
    HONKAI_IMPACT_VARIABLE_NAME: 'retcode',
    HONKAI_IMPACT_VARIABLE_VALUE_SUCCESS: 0,
    HONKAI_IMPACT_VARIABLE_VALUE_CHECKED: -5003,
};