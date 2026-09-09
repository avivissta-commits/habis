-- הביס הבא — seed data: all existing restaurants migrated from the app.
-- Generated from the original in-app seed(); no data added or lost, no duplicates.
-- Each row is guarded by name+address so re-running never creates duplicates.

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Gaijin Izakaya', 'תל אביב', 'לב העיר', 'לילינבלום 29, תל אביב', '052-3119298', 'notVisited', '4', '["אסייתי","דגים","שף"]', '["ערב","דרינק","דייט","עם חברים","חגיגה","אווירה","ערב מיוחד"]', '["יפני","איזקאיה","סושי","סשימי","סאקה","גריל יפני"]', '[]', '[]', '[]', 0, 0, '2026-09-08T13:34:37.660Z', '2026-09-08T13:34:37.675Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Gaijin Izakaya' AND IFNULL(address,'') = IFNULL('לילינבלום 29, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'קפה טאיזו', 'תל אביב', 'מרכז העיר', 'דרך מנחם בגין 23, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/cafe-taizu', 'notVisited', '3', 'הכתובת העדכנית: דרך מנחם בגין 23.', '["אסייתי","שף"]', '["צהריים","ערב","דייט","עם חברים","משפחה","אווירה"]', '["אסייתי","יובל בן נריה","דרום מזרח אסיה"]', '[]', '[]', '[]', 0, 0, '2026-09-07T13:34:37.675Z', '2026-09-07T13:34:37.675Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'קפה טאיזו' AND IFNULL(address,'') = IFNULL('דרך מנחם בגין 23, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Joseph ''N'' Sons', 'תל אביב', 'כיכר רבין', 'מלכי ישראל 10, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/joseph-n-sons', '03-9611141', 'notVisited', '2', '["דגים"]', '["צהריים","ערב","עם חברים","משפחה","קליל","משהו מהיר","ישיבה בחוץ"]', '["פיש אנד צ׳יפס","סלמון בורגר","דגים","קלמרי","שרימפס"]', '[]', '[]', '[]', 0, 0, '2026-09-06T13:34:37.675Z', '2026-09-06T13:34:37.675Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Joseph ''N'' Sons' AND IFNULL(address,'') = IFNULL('מלכי ישראל 10, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Rothschild 48 Brasserie', 'תל אביב', 'לב העיר', 'שדרות רוטשילד 48, תל אביב', '03-5560011', 'notVisited', '4', '["שף","ים תיכוני","דגים"]', '["צהריים","ערב","דרינק","דייט","חגיגה","אווירה","ערב מיוחד"]', '["בראסרי","R2M","רותי ברודו","מלון R48"]', '[]', '[]', '[]', 0, 0, '2026-09-05T13:34:37.675Z', '2026-09-05T13:34:37.675Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Rothschild 48 Brasserie' AND IFNULL(address,'') = IFNULL('שדרות רוטשילד 48, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'רובע א׳', 'תל אביב', 'נווה צדק', 'יהושע התלמי 18, תל אביב', '053-5500605', 'notVisited', '3', 'מסעדה כשרה חלבית ודגים.', '["ים תיכוני","דגים","שף"]', '["ערב","דייט","חגיגה","אווירה","ערב מיוחד","ישיבה בחוץ"]', '["כשר","חלבי","דגים","אביתר מלכה","מלון אלקונין"]', '[]', '[]', '[]', 0, 0, '2026-09-04T13:34:37.676Z', '2026-09-04T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'רובע א׳' AND IFNULL(address,'') = IFNULL('יהושע התלמי 18, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'WABI Ramen', 'תל אביב', 'לב העיר', 'דה פיג׳וטו 23, תל אביב', 'notVisited', '2', '["אסייתי"]', '["צהריים","ערב","עם חברים","קליל","משהו מהיר"]', '["יפני","ראמן","אטריות בעבודת יד","דין שושני"]', '[]', '[]', '[]', 0, 0, '2026-09-03T13:34:37.676Z', '2026-09-03T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'WABI Ramen' AND IFNULL(address,'') = IFNULL('דה פיג׳וטו 23, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'נאם', 'תל אביב', 'הצפון הישן', 'דיזנגוף 293, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/nam-dizengoff', '03-6708050', 'notVisited', '2', '["אסייתי"]', '["צהריים","ערב","דייט","עם חברים","משפחה","קליל"]', '["תאילנדי","קארי","נודלס","פירות ים"]', '[]', '[]', '[]', 0, 0, '2026-09-02T13:34:37.676Z', '2026-09-02T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'נאם' AND IFNULL(address,'') = IFNULL('דיזנגוף 293, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'אנסטסיה', 'תל אביב', 'מרכז העיר', 'פרישמן 54, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/anastasia', '03-5290095', 'notVisited', '2', '["בית קפה"]', '["ארוחת בוקר","בראנץ׳","צהריים","ערב","דייט","קליל","רגוע"]', '["טבעוני","בריאות","ללא סוכר לבן","ללא קמח לבן"]', '[]', '[]', '[]', 0, 0, '2026-09-01T13:34:37.676Z', '2026-09-01T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'אנסטסיה' AND IFNULL(address,'') = IFNULL('פרישמן 54, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'טאלי לאמה', 'תל אביב', 'מרכז העיר', 'דרך מנחם בגין 48, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/tali-lama-tlv', '051-2608026', 'notVisited', '2', 'ישיבה במקום א׳–ה׳ 11:00-15:30.', '["אסייתי"]', '["צהריים","קליל","משהו מהיר"]', '["הודי","טבעוני","כשר","ללא גלוטן","תבשילים"]', '[]', '[]', '[]', 0, 0, '2026-08-31T13:34:37.676Z', '2026-08-31T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'טאלי לאמה' AND IFNULL(address,'') = IFNULL('דרך מנחם בגין 48, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'הקטן', 'תל אביב', 'שוק לוינסקי', 'לוינסקי 46, תל אביב', 'notVisited', '3', '["שף","דגים","ישראלי"]', '["ערב","דרינק","דייט","עם חברים","אווירה","ישיבה בחוץ"]', '["עידו קבלן","שוק לוינסקי","יין","אוכל ישראלי עכשווי"]', '[]', '[]', '[]', 0, 0, '2026-08-30T13:34:37.676Z', '2026-08-30T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'הקטן' AND IFNULL(address,'') = IFNULL('לוינסקי 46, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Sachi Ramen & Sushi', 'תל אביב', 'כיכר דיזנגוף', 'דיזנגוף 98, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/sachi-sushi-tlv', '054-5370076', 'notVisited', '2', '["אסייתי","דגים"]', '["צהריים","ערב","דייט","עם חברים","קליל"]', '["יפני","ראמן","סושי","סשימי"]', '[]', '[{"id":"mtu547l8ujlb72","enabled":true,"days":[0,1,2,3,4],"start":"12:30","end":"15:00","offer":"20% הנחה על מנות פתיחה, סושי, בירה ויין","conditions":"לא כולל ראמן; לא תקף בחגים ובאירועים מיוחדים"},{"id":"mtu547l8pqv9cd","enabled":true,"days":[0,1,2,3,4],"start":"17:00","end":"20:00","offer":"20% הנחה על מנות פתיחה, סושי, בירה ויין","conditions":"לא כולל ראמן; לא תקף בחגים ובאירועים מיוחדים"}]', '[]', 0, 0, '2026-08-29T13:34:37.676Z', '2026-08-29T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Sachi Ramen & Sushi' AND IFNULL(address,'') = IFNULL('דיזנגוף 98, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Thai 148', 'תל אביב', 'הצפון הישן', 'דיזנגוף 148, תל אביב', '053-5430586', 'notVisited', '2', 'עסקית א׳–ד׳ 12:00-16:00 עם 15% הנחה על התפריט.', '["אסייתי"]', '["צהריים","ערב","דרינק","דייט","עם חברים","אווירה"]', '["תאילנדי","קוקטיילים"]', '[]', '[{"id":"mtu547l8axffak","enabled":true,"days":[0,1,2,3,4,6],"start":"17:00","end":"19:00","offer":"20% הנחה על האלכוהול","conditions":"לא מתקיים ביום שישי"}]', '[]', 0, 0, '2026-08-28T13:34:37.676Z', '2026-08-28T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Thai 148' AND IFNULL(address,'') = IFNULL('דיזנגוף 148, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'גברת קוואיטיאו', 'תל אביב', 'שוק הכרמל', 'יום טוב 2, תל אביב', '053-8848618', 'notVisited', '2', '["אסייתי"]', '["צהריים","ערב","קליל","משהו מהיר","ישיבה בחוץ"]', '["תאילנדי","אוכל רחוב","קוואי טיאו","שוק הכרמל"]', '[]', '[]', '[]', 0, 0, '2026-08-27T13:34:37.676Z', '2026-08-27T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'גברת קוואיטיאו' AND IFNULL(address,'') = IFNULL('יום טוב 2, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'ASA Izakaya', 'תל אביב', 'לב העיר', 'אחד העם 54, תל אביב', '03-3752977', 'notVisited', '3', '["אסייתי","דגים"]', '["ערב","דרינק","דייט","עם חברים","חגיגה","אווירה","ערב מיוחד"]', '["יפני","איזקאיה","אירורי","סושי","גיוזה","ראמן","אודון","טמפורה","יקיטורי"]', '[]', '[]', '[]', 0, 0, '2026-08-26T13:34:37.676Z', '2026-08-26T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'ASA Izakaya' AND IFNULL(address,'') = IFNULL('אחד העם 54, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Kimura-ya.J', 'תל אביב', 'לב העיר', 'מזא״ה 3, תל אביב', '055-2996579', 'notVisited', '2', 'פתוח ב׳–ש׳ 18:00-00:00; הזמנה אחרונה ב-23:00.', '["אסייתי"]', '["ערב","דייט","עם חברים","קליל","אווירה"]', '["יפני","איזקאיה","ראמן","סושי","יקיטורי","שאבו שאבו","סוקיאקי"]', '[]', '[]', '[]', 0, 0, '2026-08-25T13:34:37.676Z', '2026-08-25T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Kimura-ya.J' AND IFNULL(address,'') = IFNULL('מזא״ה 3, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'אליבי', 'תל אביב', 'מרכז העיר', 'פרישמן 41, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/alibi-sushi-bar', '054-5784838', 'notVisited', '2', '["אסייתי","דגים"]', '["ערב","דרינק","דייט","עם חברים","אחרי עבודה","אווירה","ישיבה בחוץ"]', '["אסייתי","סושי","קוקטיילים"]', '[]', '[{"id":"mtu547l8727mar","enabled":true,"days":[0,1,2,3,4],"start":"18:00","end":"20:00","offer":"20% הנחה על אוכל, 40% הנחה על שתייה","conditions":"לא חל על מנות עם טונה אדומה"}]', '[]', 0, 0, '2026-08-24T13:34:37.676Z', '2026-08-24T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'אליבי' AND IFNULL(address,'') = IFNULL('פרישמן 41, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Saka Ba', 'תל אביב', 'פלורנטין', 'זבולון 8, תל אביב', 'notVisited', '2', '["אסייתי"]', '["ערב","דרינק","דייט","עם חברים","אווירה"]', '["יפני","סאקה","איזקאיה"]', '[]', '[]', '[]', 0, 0, '2026-08-23T13:34:37.676Z', '2026-08-23T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Saka Ba' AND IFNULL(address,'') = IFNULL('זבולון 8, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'OBI', 'תל אביב', 'לב העיר', 'יבנה 31, תל אביב', '077-8801744', 'notVisited', '3', '["אסייתי","דגים"]', '["ערב","דרינק","דייט","עם חברים","אחרי עבודה","אווירה","ערב מיוחד"]', '["יפני","איזקאיה","סאקה","גריל פחמים","מוזיקה","DJ"]', '[]', '[{"id":"mtu547l8a9142m","enabled":true,"days":[0,1,2,3,4],"start":"18:00","end":"19:30","offer":"25% הנחה על התפריט + סאקה ללא תחתית","conditions":"סאקה ללא תחתית בהזמנת קראף"}]', '[]', 0, 0, '2026-08-22T13:34:37.676Z', '2026-08-22T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'OBI' AND IFNULL(address,'') = IFNULL('יבנה 31, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Cichukai', 'תל אביב', 'שוק הפשפשים', 'עמיעד 10, יפו', '03-9653565', 'notVisited', '3', '["אסייתי","דגים","שף"]', '["ערב","דרינק","דייט","עם חברים","אחרי עבודה","אווירה","ערב מיוחד"]', '["יפני","פרואני","ניקיי","אור גינסברג","קוקטיילים"]', '[]', '[{"id":"mtu547l8iw2ufz","enabled":true,"days":[1,2,3,6],"start":"18:00","end":"19:00","offer":"20% הנחה על יין וקוקטיילים, 10% הנחה על התפריט והספיישלים","conditions":"לא כולל ארוחה זוגית"}]', '[]', 0, 0, '2026-08-21T13:34:37.676Z', '2026-08-21T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Cichukai' AND IFNULL(address,'') = IFNULL('עמיעד 10, יפו','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Selas', 'תל אביב', 'יפו', 'רבי תנחום 6, יפו', 'https://wolt.com/he/isr/tel-aviv/restaurant/sales', '03-9653565', 'notVisited', '3', '["אסייתי","דגים","שף"]', '["ערב","דרינק","דייט","עם חברים","חגיגה","אווירה","ערב מיוחד"]', '["אור גינסברג","אסייתי","סושי","דגים","פיוז׳ן"]', '[]', '[{"id":"mtu547l8yrt8fm","enabled":true,"days":[1,2,3],"start":"18:00","end":"19:00","offer":"20% הנחה על יין וקוקטיילים"},{"id":"mtu547l8f1eyzr","enabled":true,"days":[4,5,6],"start":"17:00","end":"18:30","offer":"20% הנחה על יין וקוקטיילים"}]', '[]', 0, 0, '2026-08-20T13:34:37.676Z', '2026-08-20T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Selas' AND IFNULL(address,'') = IFNULL('רבי תנחום 6, יפו','')
);

INSERT INTO restaurants (name, city, area, address, delivery_url, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'אונמי', 'תל אביב', 'מתחם הארבעה', 'הארבעה 18, תל אביב', 'https://wolt.com/he/isr/tel-aviv/restaurant/onami', 'notVisited', '3', '["אסייתי","דגים"]', '["צהריים","ערב","דייט","עם חברים","משפחה"]', '["יפני","סושי","סשימי"]', '[]', '[]', '[]', 0, 0, '2026-08-19T13:34:37.676Z', '2026-08-19T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'אונמי' AND IFNULL(address,'') = IFNULL('הארבעה 18, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'בטשון', 'תל אביב', 'מרכז העיר', 'קרליבך 29, תל אביב', '077-5575315', 'notVisited', '2', '["דגים"]', '["צהריים","ערב","עם חברים","קליל","משהו מהיר","ישיבה בחוץ"]', '["דגים","פירות ים","חנות דגים","סטריט פוד"]', '[]', '[]', '[]', 0, 0, '2026-08-18T13:34:37.676Z', '2026-08-18T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'בטשון' AND IFNULL(address,'') = IFNULL('קרליבך 29, תל אביב','')
);

INSERT INTO restaurants (name, status, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'האומקאסה של עומר ניצן', 'notVisited', '["אסייתי","דגים","שף"]', '["ערב","דייט","חגיגה","ערב מיוחד"]', '["אומקאסה","יפני"]', '[]', '[]', '[]', 0, 0, '2026-08-17T13:34:37.676Z', '2026-08-17T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'האומקאסה של עומר ניצן' AND address IS NULL
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'UMAI', 'תל אביב', 'יפו', 'עבד אל ראוף אל ביטאר 8, יפו', '052-5977897', 'notVisited', '4', 'חלל אירוח אינטימי עם ערבי טעימות בהזמנה מראש.', '["אסייתי","דגים","שף"]', '["ערב","דייט","חגיגה","אווירה","ערב מיוחד"]', '["יפני","קייסקי","ניקו קאפו","איזקאיה","אלכס אברמוב","ארוחת טעימות"]', '[]', '[]', '[]', 0, 0, '2026-08-16T13:34:37.676Z', '2026-08-16T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'UMAI' AND IFNULL(address,'') = IFNULL('עבד אל ראוף אל ביטאר 8, יפו','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'טראסו', 'תל אביב', 'יפו', 'יפת 20, יפו', '055-9899366', 'notVisited', '4', '["אסייתי","דגים","שף"]', '["ערב","דייט","חגיגה","אווירה","ערב מיוחד"]', '["יפני","אומקאסה","סושי","דניאל שיף","ארוחת טעימות"]', '[]', '[]', '[]', 0, 0, '2026-08-15T13:34:37.676Z', '2026-08-15T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'טראסו' AND IFNULL(address,'') = IFNULL('יפת 20, יפו','')
);

INSERT INTO restaurants (name, city, area, address, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'הגלריה של השף אורי זיסו', 'פתח תקווה', 'מושב רינתיה', 'מושב רינתיה', '054-6655185', 'notVisited', '4', 'אומקאסה כ-12 מנות; Pop Omakase כ-8 מנות; סיטים 18:30 ו-21:00; עד 16 סועדים.', '["אסייתי","דגים","שף"]', '["ערב","דייט","חגיגה","אווירה","ערב מיוחד"]', '["יפני","איזקאיה","אומקאסה","ארוחת טעימות","אורי זיסו"]', '[]', '[]', '[]', 0, 0, '2026-08-14T13:34:37.676Z', '2026-08-14T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'הגלריה של השף אורי זיסו' AND IFNULL(address,'') = IFNULL('מושב רינתיה','')
);

INSERT INTO restaurants (name, city, area, address, reservation_url, menu_url, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'NOEMA', 'תל אביב', 'נחלת בנימין', 'נחלת בנימין 59, תל אביב-יפו', 'https://ontopo.com/he/il/page/15172114', 'https://ontopo.com/he/il/page/15172114', '077-9386186', 'notVisited', '3', 'בסופי שבוע מוגש בראנץ׳ (שישי ושבת 12:00-17:00).', '["ים תיכוני","דגים","שף"]', '["ערב","דרינק","דייט","עם חברים","חגיגה","אווירה","ערב מיוחד"]', '["בר אוכל","קוקטיילים","מטבח מקומי","דרך המשי","דגים","פסטות","מושיקו אברהם"]', '[]', '[{"id":"mtu547l8fsabmv","enabled":true,"days":[0,1,2,3,4],"start":"18:00","end":"20:00","offer":"20% הנחה על האוכל, 30% הנחה על האלכוהול"}]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'NOEMA' AND IFNULL(address,'') = IFNULL('נחלת בנימין 59, תל אביב-יפו','')
);

INSERT INTO restaurants (name, city, area, address, website_url, reservation_url, menu_url, delivery_url, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'TYO', 'תל אביב', 'נווה צדק', 'שבזי 58, תל אביב-יפו', 'https://tyo.co.il/', 'https://ontopo.com/he/il/page/tyo', 'https://tyo.co.il/tyo-%D7%AA%D7%A4%D7%A8%D7%99%D7%98-%D7%A2%D7%A8%D7%91/', 'https://wolt.com/he/isr/tel-aviv/restaurant/tyo', '03-9300333', 'notVisited', '4', 'א׳–ד׳ 12:00-16:00 גם הטבת צהריים של 15% הנחה על התפריט.', '["אסייתי","דגים","שף"]', '["צהריים","ערב","דרינק","דייט","עם חברים","חגיגה","אווירה","ערב מיוחד"]', '["יפני","סושי","סשימי","סאקה","יאמה סאן","לא כשר"]', '[]', '[{"id":"mtu547l82b7pwg","enabled":true,"days":[0,1,2,3],"start":"16:00","end":"19:00","offer":"25% הנחה על כל תפריט האוכל והאלכוהול"}]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'TYO' AND IFNULL(address,'') = IFNULL('שבזי 58, תל אביב-יפו','')
);

INSERT INTO restaurants (name, city, area, address, website_url, reservation_url, menu_url, phone, status, price_level, notes, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'פופינה', 'תל אביב', 'נווה צדק', 'אחד העם 3, תל אביב-יפו', 'https://www.popina.co.il/', 'https://ontopo.com/he/il/page/popina', 'https://www.popina.co.il/menus-1', '03-5757477', 'notVisited', '4', 'ארוחת טעימות 6 מנות ב-430 ₪; התאמת 5 כוסות אלכוהול ב-215 ₪.', '["דגים","שף"]', '["ערב","דרינק","דייט","עם חברים","חגיגה","אווירה","ערב מיוחד","ישיבה בחוץ"]', '["אוראל קמחי","מסעדת שף","ארוחת טעימות","דגים","פירות ים","קוקטיילים","לא כשר"]', '["ארוחת טעימות","סשימי טונה","טליוליני שרימפס","פילה דג צלוי"]', '[]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'פופינה' AND IFNULL(address,'') = IFNULL('אחד העם 3, תל אביב-יפו','')
);

INSERT INTO restaurants (name, city, area, address, website_url, reservation_url, menu_url, delivery_url, phone, status, price_level, notes, source_url, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Brasserie 18', 'תל אביב', 'לבונטין', 'לבונטין 19, תל אביב-יפו', 'https://brasstlv.co.il/', 'https://brasstlv.co.il/', 'https://brasstlv.co.il/menu/', 'https://orders.beecommcloud.com/#/sites/p-0/655eeb12d541bee19f59e443', '03-5472548', 'notVisited', '3', 'בראסרי כשרה חלבית. שעות: א׳–ה׳ בראנץ׳ 09:30-13:00, צהריים 13:00-16:00, ערב 17:00-22:00; שישי בראנץ׳ 09:00-15:00; שבת סגור.', 'https://brasstlv.co.il/', '["איטלקי","ים תיכוני","דגים"]', '["ארוחת בוקר","בראנץ׳","צהריים","ערב","דרינק","דייט","עם חברים","אחרי עבודה","חגיגה","רגוע","אווירה","ערב מיוחד","ישיבה בחוץ"]', '["כשר","חלבי","בראסרי","צרפתי","אירופאי","דגים","יין"]', '[]', '[{"id":"mtu547l8ku4feo","enabled":true,"days":[0,1,2,3,4],"start":"17:00","end":"19:00","offer":"30% הנחה"}]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Brasserie 18' AND IFNULL(address,'') = IFNULL('לבונטין 19, תל אביב-יפו','')
);

INSERT INTO restaurants (name, city, area, address, website_url, menu_url, delivery_url, phone, status, price_level, notes, source_url, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'מתחת לעץ', 'תל אביב', 'הצפון הישן', 'בן יהודה 202, תל אביב', 'https://underthetree.co.il/', 'https://wolt.com/he/isr/tel-aviv/restaurant/under-the-tree', 'https://wolt.com/he/isr/tel-aviv/restaurant/under-the-tree', '03-6359033', 'notVisited', '2', 'הסניף המקורי בבן יהודה 202; קיים גם סניף בלבונטין 13. פעיל לאורך רוב שעות היממה.', 'https://www.hashulchan.co.il/restaurant/%D7%9E%D7%AA%D7%97%D7%AA-%D7%9C%D7%A2%D7%A5/', '["בית קפה","ישראלי"]', '["ארוחת בוקר","בראנץ׳","צהריים","ערב","עם חברים","משפחה","קליל","רגוע","משהו מהיר","ישיבה בחוץ"]', '["בית קפה שכונתי","טבעוני","ללא גלוטן","ארוחות בוקר","כריכים","סלטים","בולים"]', '[]', '[]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'מתחת לעץ' AND IFNULL(address,'') = IFNULL('בן יהודה 202, תל אביב','')
);

INSERT INTO restaurants (name, city, area, address, maps_url, website_url, phone, status, price_level, notes, source_url, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'הכרמל 40', 'תל אביב', 'שוק הכרמל', 'הכרמל 40, תל אביב-יפו', 'https://www.waze.com/live-map/directions/il/tel-aviv-district/tel-aviv-yafo/%D7%94%D7%9B%D7%A8%D7%9E%D7%9C-40-hacarmel?to=place.ChIJU1A3LyxNHRURbxIdXiNg3H8', 'https://www.facebook.com/hacarmel40', '054-489-8022', 'notVisited', '2', 'המקום עובד בשיתוף עם חנות הדגים דגי רוסתום בשוק הכרמל. מנת הדגל היא "כריך דייגים" — כריך דג בסגנון באליק אקמק, עם דג טרי בלחם; ביקורות עדכניות מזכירות בין היתר גרסה עם פילה לברק, לחם/פרנה קלוי וחריף. בנוסף מופיעים סביצ׳ה אינטיאס ומנגו ומנות דגים ופירות ים מטוגנים. שעות פעילות שמופיעות כיום: א׳–ה׳ 11:00-17:30, ו׳ 10:00-17:00, שבת סגור.', 'https://timeout.co.il/%D7%94%D7%9B%D7%A8%D7%9E%D7%9C-40/', '["דגים"]', '["צהריים","עם חברים","קליל","משהו מהיר","ישיבה בחוץ"]', '["כריך דייגים","סנדוויץ דג","דגים טריים","לברק","אינטיאס","מנגו","שוק הכרמל","דגי רוסתום","אלעד אמיתי"]', '["כריך דייגים","סביצ׳ה אינטיאס ומנגו"]', '[]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'הכרמל 40' AND IFNULL(address,'') = IFNULL('הכרמל 40, תל אביב-יפו','')
);

INSERT INTO restaurants (name, city, area, address, website_url, reservation_url, menu_url, delivery_url, phone, status, price_level, notes, source_url, cuisine, suitable_for, tags, want_to_try, happy_hours, visits, next_up, visit_count, created_at, updated_at)
SELECT 'Grinberg Burger', 'תל אביב', 'לב העיר', 'שינקין 22, תל אביב', 'https://www.grinbergburger.co.il/lp/gb', 'https://www.grinbergburger.co.il/lp/gb', 'https://www.grinbergburger.co.il/warehouse/dynamic/466853.pdf', 'https://wolt.com/he/isr/tel-aviv/restaurant/grinberg-burger-sheinkin', '073-3277294', 'notVisited', '2', 'מנת הדג נקראת GRIN-FISH: דג ים פריך, רוטב טרטר טרגון, לימון וגבינת צ׳דר בלחמנייה. בתפריט הרשמי המחיר למנה הוא 64 ₪; ארוחת GRIN FISH ב-Wolt כוללת את כריך הדג, צ׳יפס עם כוסברה, שום ופטרוזיליה ושתייה ב-86 ₪. הסניף בשינקין פתוח לפי האתר הרשמי 12:00-22:30. למקום יש גם סניף בצפון תל אביב, גרינברג 25. לא נמצא Happy Hour קבוע ומאומת.', 'https://13tv.co.il/item/yummies/food-news/fo37g-904486793/', '["בורגר","דגים"]', '["צהריים","ערב","עם חברים","משפחה","קליל","משהו מהיר"]', '["פיש בורגר","שניצל דג","GRIN-FISH","דג ים","טרטר טרגון","צ׳דר","לימון","המבורגר","אורי עשת"]', '["GRIN-FISH"]', '[]', '[]', 0, 0, '2026-09-09T13:34:37.676Z', '2026-09-09T13:34:37.676Z'
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE name = 'Grinberg Burger' AND IFNULL(address,'') = IFNULL('שינקין 22, תל אביב','')
);
