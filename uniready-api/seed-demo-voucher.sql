INSERT INTO admins (email, password_hash, full_name)
VALUES ('demo@uniready.test', 'placeholder', 'Demo Admin');

INSERT INTO voucher_batches (label, popup_title, popup_message, popup_image_url, created_by)
SELECT 'Client Demo Batch',
       'Investing in a Brighter Nigeria',
       'Sponsored by Sen. Natasha Apoti Uduaghan — quality education, supported today.',
       'http://localhost:5173/demo/sponsor-demo.jpeg',
       id
FROM admins WHERE email = 'demo@uniready.test';

INSERT INTO vouchers (code_hash, batch_id, premium_days)
SELECT encode(sha256('CLIENTDEMO'::bytea), 'hex'), id, 30
FROM voucher_batches WHERE label = 'Client Demo Batch';