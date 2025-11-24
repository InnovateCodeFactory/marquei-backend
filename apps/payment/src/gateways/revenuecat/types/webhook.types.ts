import { RevenueCatPlanId } from './revenuecat-plans.types';

export interface RevenueCatEventPayload {
  event: RevenueCatEvent;
  api_version: string;
}

export interface RevenueCatEvent {
  event_timestamp_ms: number;
  product_id: RevenueCatPlanId;
  period_type: 'NORMAL' | 'INTRO' | 'TRIAL';
  purchased_at_ms: number;
  expiration_at_ms: number;
  environment: 'SANDBOX' | 'PRODUCTION';
  entitlement_id: string | null;
  entitlement_ids: string[];
  presented_offering_id: string | null;
  transaction_id: string;
  original_transaction_id: string;
  is_family_share: boolean;
  country_code: string;
  app_user_id: string; // !! BUSINESS SLUG
  aliases: string[];
  original_app_user_id: string;
  new_product_id: string | null;
  currency: string;
  price: number;
  price_in_purchased_currency: number;

  subscriber_attributes: {
    [key: string]: RevenueCatSubscriberAttribute;
  };

  store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
  takehome_percentage: number;
  offer_code: string | null;
  tax_percentage: number;
  commission_percentage: number;
  metadata: any | null;
  renewal_number: number | null;
  type:
    | 'INITIAL_PURCHASE'
    | 'RENEWAL'
    | 'CANCELLATION'
    | 'UNCANCELLATION'
    | 'NON_RENEWING_PURCHASE'
    | 'PRODUCT_CHANGE'
    | 'EXPIRATION'
    | 'BILLING_ISSUE';
  id: string;
  app_id: string;
}

export interface RevenueCatSubscriberAttribute {
  value: string | number | boolean | null;
  updated_at_ms: number;
}

// {

// 
//   "event": {

//     "event_timestamp_ms": 1763770885691,

//     "product_id": "com.innovatecode.marqueipro.sub.plan10_infinity",

//     "period_type": "NORMAL",

//     "purchased_at_ms": 1763736335000,

//     "expiration_at_ms": 1763822735000,

//     "environment": "SANDBOX",

//     "entitlement_id": null,

//     "entitlement_ids": [

//       "pro"

//     ],

//     "presented_offering_id": "default",

//     "transaction_id": "2000001062388128",

//     "original_transaction_id": "2000001061795298",

//     "is_family_share": false,

//     "country_code": "BR",

//     "app_user_id": "barbearia-do-carlos",

//     "aliases": [

//       "$RCAnonymousID:f54ecd44ed134e4a8d5edb24b2174c02",

//       "barbearia-do-carlos"

//     ],

//     "original_app_user_id": "$RCAnonymousID:f54ecd44ed134e4a8d5edb24b2174c02",

//     "new_product_id": "com.innovatecode.marqueipro.sub.plan_basic",

//     "currency": "BRL",

//     "price": 0,

//     "price_in_purchased_currency": 0,

//     "subscriber_attributes": {

//       "$attConsentStatus": {

//         "value": "notDetermined",

//         "updated_at_ms": 1763695477644

//       },

//       "email": {

//         "value": "chziegler445@gmail.com",

//         "updated_at_ms": 1763770847316

//       },

//       "user_id": {

//         "value": "cmhs6elao0013yx3jqs3yge7j",

//         "updated_at_ms": 1763770847316

//       },

//       "business_slug": {

//         "value": "barbearia-do-carlos",

//         "updated_at_ms": 1763770847317

//       },

//       "name": {

//         "value": "Carlos",

//         "updated_at_ms": 1763770847317

//       }

//     },

//     "store": "APP_STORE",

//     "takehome_percentage": 0.7,

//     "offer_code": null,

//     "tax_percentage": 0.1263,

//     "commission_percentage": 0.2621,

//     "metadata": null,

//     "renewal_number": null,

//     "type": "PRODUCT_CHANGE",

//     "id": "BBA6E85C-B0C7-4D35-875C-E9FE61EC824B",

//     "app_id": "app5fa80aa510"

//   },

//   "api_version": "1.0"

// }
