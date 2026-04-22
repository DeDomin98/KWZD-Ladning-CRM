const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

console.log("System: Ładowanie funkcji...");

let nodemailer;
try {
    nodemailer = require("nodemailer");
    console.log("System: Nodemailer załadowany poprawnie.");
} catch (e) {
    console.error("KRYTYCZNY BŁĄD: Nie znaleziono biblioteki nodemailer!", e);
}

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ============================================================
// DANE FIRMY
// ============================================================
const COMPANY = {
    name: "KWZD Sp. z o.o.",
    fullName: "KWZD Sp. z o.o.",
    address: "ul. Św. Mikołaja 8/11/208, 50-125 Wrocław",
    email: "kontakt@wyjscie-z-dlugow.pl",
    phone: "+48 795 767 711",
    website: "https://wyjscie-z-dlugow.pl",
    representative: "Dominik Hardek",
    representativeTitle: "Prezes Zarządu",
    brandColor: "#1e3a5f",
    accentColor: "#2563eb"
};

// ============================================================
// FUNKCJA 1: Wysyłka emaili z umowami (INTELIGENTNA)
// ============================================================
exports.sendContractEmailOnCreate = functions
    .region('us-central1')
    .runWith({
        secrets: ["GMAIL_PASSWORD"],
        memory: "512MB",
        timeoutSeconds: 60
    })
    .firestore.document('emailQueue/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const docId = context.params.docId;

        console.log(`Nowy email w kolejce: ${docId}`);
        console.log(`Wysyłka do: ${data.clientEmail}, Klient: ${data.clientName}`);

        if (!data.clientEmail || !data.documents) {
            console.error('Brak wymaganych danych');
            await snap.ref.update({ status: 'error', error: 'Brak wymaganych danych' });
            return null;
        }

        if (!process.env.GMAIL_PASSWORD) {
            console.error("Błąd: Brak sekretu GMAIL_PASSWORD!");
            await snap.ref.update({ status: 'error', error: 'Brak konfiguracji email' });
            return null;
        }

        try {
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: 'kontakt@wyjscie-z-dlugow.pl',
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            await transporter.verify();
            console.log("Połączenie z Gmail: OK");

            // --- DETEKCJA TYPU WIADOMOŚCI ---
            // Sprawdzamy co faktycznie przyszło w obiekcie documents
            const hasContract = !!data.documents.contract;
            const hasRodo = !!data.documents.rodo;
            const hasWithdrawal = !!data.documents.withdrawal;

            // Ustawiamy zmienne tekstowe w zależności od zawartości
            let emailSubject = "";
            let emailHeaderTitle = "";
            let emailBodyText = "";

            if (hasContract && !hasRodo) {
                // Scenariusz: TYLKO UMOWA
                emailSubject = `Umowa do podpisu - ${data.clientName} | Wyjście z Długów`;
                emailHeaderTitle = "Umowa do podpisu";
                emailBodyText = `W załączeniu przesyłamy przygotowaną <strong>Umowę na wykonanie usługi</strong> z dnia <strong style="color: #1e293b;">${data.contractDate}</strong>. Prosimy o zapoznanie się z jej treścią i podpisanie.`;
            }
            else if (!hasContract && (hasRodo || hasWithdrawal)) {
                // Scenariusz: TYLKO RODO/ODSTĄPIENIE
                emailSubject = `Dokumenty RODO i Odstąpienie - ${data.clientName} | Wyjście z Długów`;
                emailHeaderTitle = "Dokumenty informacyjne";
                emailBodyText = `W załączeniu przesyłamy <strong>Klauzulę RODO</strong> oraz <strong>Formularz odstąpienia od umowy</strong>. Są to dokumenty informacyjne wymagane prawem.`;
            }
            else {
                // Scenariusz: KOMPLET (lub inne kombinacje)
                emailSubject = `Dokumenty umowy - ${data.clientName} | Wyjście z Długów`;
                emailHeaderTitle = "Komplet dokumentów";
                emailBodyText = `W załączeniu przesyłamy komplet dokumentów związanych z umową z dnia <strong style="color: #1e293b;">${data.contractDate}</strong>. Prosimy o dokładne zapoznanie się z ich treścią.`;
            }

            // --- POBIERANIE ZAŁĄCZNIKÓW ---
            const fetchFile = async (url, filename) => {
                try {
                    console.log(`Pobieranie: ${filename}`);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Status ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    return { filename, content: Buffer.from(arrayBuffer) };
                } catch (err) {
                    console.error(`Błąd pobierania ${filename}:`, err);
                    return null;
                }
            };

            const attachments = [];
            const { documents } = data;

            if (hasContract) {
                attachments.push(await fetchFile(documents.contract.url, documents.contract.fileName));
            }
            if (hasRodo) {
                attachments.push(await fetchFile(documents.rodo.url, documents.rodo.fileName));
            }
            if (hasWithdrawal) {
                attachments.push(await fetchFile(documents.withdrawal.url, documents.withdrawal.fileName));
            }

            const validAttachments = attachments.filter(a => a !== null);
            console.log(`Załączniki: ${validAttachments.length}`);

            const contractId = data.contractId;
            const confirmationUrl = `${COMPANY.website}/potwierdzenie-umowy?id=${contractId}`;

            // --- KONSTRUKCJA EMAILA ---
            const mailOptions = {
                from: `"Wyjście z Długów" <${COMPANY.email}>`,
                to: data.clientEmail,
                subject: emailSubject,
                html: `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, ${COMPANY.brandColor} 0%, #2d4a6f 100%); padding: 40px 50px; border-radius: 16px 16px 0 0;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                            Wyjście z Długów
                                        </h1>
                                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                                            Profesjonalna pomoc w oddłużaniu
                                        </p>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; text-align: center; line-height: 60px;">
                                            <span style="font-size: 28px;">📄</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #ffffff; padding: 50px;">
                            
                            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                ${emailHeaderTitle}
                            </p>
                            <h2 style="margin: 0 0 30px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
                                Szanowny/a ${data.clientName},
                            </h2>
                            
                            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.7;">
                                    ${emailBodyText}
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; font-weight: 600;">
                                Załączone pliki:
                            </p>
                            <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                
                                ${hasContract ? `
                                <tr>
                                    <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px; margin-bottom: 8px;">
                                        <table width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="40" style="vertical-align: middle;">
                                                    <span style="font-size: 20px;">📋</span>
                                                </td>
                                                <td style="color: #374151; font-size: 14px;">Umowa na wykonanie usługi</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr><td style="height: 8px;"></td></tr>
                                ` : ''}

                                ${hasRodo ? `
                                <tr>
                                    <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px;">
                                        <table width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="40" style="vertical-align: middle;">
                                                    <span style="font-size: 20px;">🔒</span>
                                                </td>
                                                <td style="color: #374151; font-size: 14px;">Klauzula RODO i zgoda na przetwarzanie</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr><td style="height: 8px;"></td></tr>
                                ` : ''}

                                ${hasWithdrawal ? `
                                <tr>
                                    <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px;">
                                        <table width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="40" style="vertical-align: middle;">
                                                    <span style="font-size: 20px;">📝</span>
                                                </td>
                                                <td style="color: #374151; font-size: 14px;">Formularz odstąpienia od umowy</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                ` : ''}

                            </table>
                            
                            ${hasContract && contractId ? `
                            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; border: 1px solid #a7f3d0;">
                                <p style="margin: 0 0 20px 0; color: #065f46; font-size: 15px; font-weight: 500;">
                                    Po zapoznaniu się z umową, potwierdź ją klikając poniższy przycisk:
                                </p>
                                <a href="${confirmationUrl}" 
                                   style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
                                    ✓&nbsp;&nbsp;Potwierdzam i podpisuję umowę
                                </a>
                                <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 12px;">
                                    Możesz też skopiować link: <a href="${confirmationUrl}" style="color: #059669; word-break: break-all;">${confirmationUrl}</a>
                                </p>
                            </div>
                            ` : ''}
                            
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 30px;">
                                <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
                                    W przypadku pytań lub wątpliwości, jesteśmy do Twojej dyspozycji:
                                </p>
                                <table cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding-right: 20px;">
                                            <a href="mailto:${COMPANY.email}" style="color: ${COMPANY.accentColor}; text-decoration: none; font-size: 14px;">
                                                ✉️ ${COMPANY.email}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px 50px; border-top: 1px solid #e2e8f0;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">Z poważaniem,</p>
                                        <p style="margin: 0 0 2px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${COMPANY.representative}</p>
                                        <p style="margin: 0; color: #64748b; font-size: 13px;">${COMPANY.representativeTitle}</p>
                                        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">${COMPANY.fullName}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: ${COMPANY.brandColor}; padding: 30px 50px; border-radius: 0 0 16px 16px;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">
                                            ${COMPANY.fullName}
                                        </p>
                                        <p style="margin: 0 0 4px 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                            ${COMPANY.address}
                                        </p>
                                        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                            ${COMPANY.email}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `,
                attachments: validAttachments
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("EMAIL WYSŁANY! MessageID:", info.messageId);

            // Aktualizuj status w kolejce
            await snap.ref.update({
                status: 'sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                messageId: info.messageId
            });

            // Aktualizuj umowę - tylko jeśli wysłaliśmy faktycznie umowę
            if (contractId && hasContract) {
                await db.collection('contracts').doc(contractId).update({
                    emailSent: true,
                    emailSentAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error("Błąd wysyłki:", error.message);
            await snap.ref.update({
                status: 'error',
                error: error.message,
                errorAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: false, error: error.message };
        }
    });


// ============================================================
// FUNKCJA 2: Email po podpisaniu umowy przez klienta
// ============================================================
exports.sendConfirmationEmailOnSign = functions
    .region('us-central1')
    .runWith({
        secrets: ["GMAIL_PASSWORD"],
        memory: "256MB",
        timeoutSeconds: 30
    })
    .firestore.document('contracts/{contractId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const contractId = context.params.contractId;

        // Sprawdź czy status zmienił się na "podpisana_przez_klienta"
        if (before.status === after.status) {
            return null;
        }

        if (after.status !== 'podpisana_przez_klienta') {
            return null;
        }

        // Sprawdź czy już wysłaliśmy email potwierdzający
        if (after.confirmationEmailSent) {
            console.log(`Email potwierdzający już wysłany dla umowy ${contractId}`);
            return null;
        }

        console.log(`Umowa ${contractId} została podpisana przez klienta. Wysyłam potwierdzenie.`);

        if (!after.clientEmail) {
            console.error('Brak adresu email klienta');
            return null;
        }

        if (!process.env.GMAIL_PASSWORD) {
            console.error("Błąd: Brak sekretu GMAIL_PASSWORD!");
            return null;
        }

        try {
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: 'kontakt@wyjscie-z-dlugow.pl',
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            const signedDate = after.signedAt?.toDate?.() || new Date();
            const formattedSignedDate = signedDate.toLocaleString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const mailOptions = {
                from: `"Wyjście z Długów" <${COMPANY.email}>`,
                to: after.clientEmail,
                subject: `✓ Umowa podpisana pomyślnie - ${after.clientName} | Wyjście z Długów`,
                html: `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 50px; border-radius: 16px 16px 0 0; text-align: center;">
                            <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px auto; line-height: 80px;">
                                <span style="font-size: 40px;">✓</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                Umowa została podpisana!
                            </h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                                Dziękujemy za zaufanie
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #ffffff; padding: 50px;">
                            
                            <h2 style="margin: 0 0 24px 0; color: #1e293b; font-size: 22px; font-weight: 700;">
                                Szanowny/a ${after.clientName},
                            </h2>
                            
                            <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.8;">
                                Z przyjemnością potwierdzamy, że Twoja umowa została <strong style="color: #059669;">pomyślnie podpisana</strong>. 
                                Dziękujemy za okazane zaufanie – jesteśmy zaszczyceni, że możemy Ci pomóc w rozwiązaniu Twoich problemów finansowych.
                            </p>
                            
                            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 28px; margin-bottom: 28px; border: 1px solid #bbf7d0;">
                                <h3 style="margin: 0 0 20px 0; color: #166534; font-size: 16px; font-weight: 600;">
                                    📋 Szczegóły umowy
                                </h3>
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #a7f3d0;">
                                            <span style="color: #64748b; font-size: 13px;">Numer umowy</span><br>
                                            <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${contractId}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #a7f3d0;">
                                            <span style="color: #64748b; font-size: 13px;">Data zawarcia umowy</span><br>
                                            <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${after.contractDate}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #a7f3d0;">
                                            <span style="color: #64748b; font-size: 13px;">Data podpisania</span><br>
                                            <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${formattedSignedDate}</span>
                                        </td>
                                    </tr>
                                    ${after.servicePrice ? `
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <span style="color: #64748b; font-size: 13px;">Wartość usługi</span><br>
                                            <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${after.servicePrice.toLocaleString('pl-PL')} PLN</span>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>
                            
                            <div style="background-color: #f8fafc; border-radius: 12px; padding: 28px; margin-bottom: 28px; border: 1px solid #e2e8f0;">
                                <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                                    🚀 Co dalej?
                                </h3>
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="width: 32px; vertical-align: top;">
                                                        <div style="width: 24px; height: 24px; background: ${COMPANY.accentColor}; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 600;">1</div>
                                                    </td>
                                                    <td style="color: #475569; font-size: 14px; line-height: 1.6;">
                                                        <strong style="color: #1e293b;">Kontakt od naszego zespołu</strong><br>
                                                        W ciągu 1-2 dni roboczych skontaktujemy się z Tobą, aby omówić kolejne kroki.
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="width: 32px; vertical-align: top;">
                                                        <div style="width: 24px; height: 24px; background: ${COMPANY.accentColor}; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 600;">2</div>
                                                    </td>
                                                    <td style="color: #475569; font-size: 14px; line-height: 1.6;">
                                                        <strong style="color: #1e293b;">Przygotowanie dokumentacji</strong><br>
                                                        Poprosimy Cię o przesłanie niezbędnych dokumentów do przygotowania wniosku.
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="width: 32px; vertical-align: top;">
                                                        <div style="width: 24px; height: 24px; background: ${COMPANY.accentColor}; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 600;">3</div>
                                                    </td>
                                                    <td style="color: #475569; font-size: 14px; line-height: 1.6;">
                                                        <strong style="color: #1e293b;">Realizacja usługi</strong><br>
                                                        Przygotujemy kompletny wniosek i będziemy Cię informować o postępach.
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 10px;">
                                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                                    Masz pytania? Jesteśmy do Twojej dyspozycji!
                                </p>
                                <a href="mailto:${COMPANY.email}" 
                                   style="display: inline-block; padding: 12px 28px; background-color: ${COMPANY.brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                                    ✉️&nbsp;&nbsp;Napisz do nas
                                </a>
                            </div>
                            
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px 50px; border-top: 1px solid #e2e8f0;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">Z poważaniem,</p>
                                        <p style="margin: 0 0 2px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${COMPANY.representative}</p>
                                        <p style="margin: 0; color: #64748b; font-size: 13px;">${COMPANY.representativeTitle}</p>
                                        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">${COMPANY.fullName}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: ${COMPANY.brandColor}; padding: 30px 50px; border-radius: 0 0 16px 16px;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">
                                            ${COMPANY.fullName}
                                        </p>
                                        <p style="margin: 0 0 4px 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                            ${COMPANY.address}
                                        </p>
                                        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                                            ${COMPANY.email}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("Email potwierdzający wysłany! MessageID:", info.messageId);

            // Oznacz że wysłaliśmy email potwierdzający
            await change.after.ref.update({
                confirmationEmailSent: true,
                confirmationEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error("Błąd wysyłki emaila potwierdzającego:", error.message);
            return { success: false, error: error.message };
        }
    });

// ============================================================
// FUNKCJA 3: Przetwarzanie leadów z kolejki (Firestore Trigger)
// ============================================================
exports.processLeadFromQueue = functions
    .region('us-central1')
    .firestore.document('leadsQueue/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const queueDocId = context.params.docId;

        console.log(`Nowy lead w kolejce: ${queueDocId}`);

        try {
            // Sprawdź czy lead już istnieje (unikaj duplikatów)
            if (data.metaLeadId) {
                const existingQuery = await db
                    .collection("leads")
                    .where("metaLeadId", "==", data.metaLeadId)
                    .limit(1)
                    .get();

                if (!existingQuery.empty) {
                    console.log(`Lead already exists: ${data.metaLeadId}`);
                    await snap.ref.delete();
                    return { success: true, message: "Lead already exists" };
                }
            }

            // Przygotuj dokument leada (zgodnie ze strukturą CRM)
            const leadDoc = {
                name: data.name || "",
                phone: data.phone || "",
                email: data.email || "",
                source: data.source || "Meta Ads",
                notes: data.notes || "",
                status: "nowy",
                assignedTo: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                contactAttempts: 0,
                contactHistory: [],
                serviceType: null,
                servicePrice: null,
                metaLeadId: data.metaLeadId || null,
                metaCreatedTime: data.metaCreatedTime || null,
                formAnswer: data.formAnswer || null
            };

            // Zapisz do kolekcji leads
            const docRef = await db.collection("leads").add(leadDoc);

            console.log(`Lead added: ${docRef.id} (Meta ID: ${data.metaLeadId}, Name: ${data.name})`);

            // Usuń z kolejki
            await snap.ref.delete();

            return { success: true, leadId: docRef.id };

        } catch (error) {
            console.error("Error processing lead:", error);
            await snap.ref.update({
                error: error.message,
                errorAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: false, error: error.message };
        }
    });

// ============================================================
// FUNKCJA 4: Dokończenie rejestracji z zaproszenia (custom link)
// - jeśli zaproszenie zawiera uid istniejącego konta, aktualizuje to
//   konto (email, hasło, displayName) i nie tworzy nowego.
// - jeśli zaproszenie nie ma uid, tworzy nowe konto (stary mechanizm).
// ============================================================
exports.completeInviteRegistration = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
        const { token, email, password } = data || {};

        if (!token || !email || !password) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Brak wymaganych danych (token, email, hasło).'
            );
        }

        try {
            // Znajdź zaproszenie po tokenie
            const inviteQuery = await db
                .collection('invitations')
                .where('token', '==', token)
                .limit(1)
                .get();

            if (inviteQuery.empty) {
                throw new functions.https.HttpsError(
                    'not-found',
                    'Nieprawidłowy link zaproszenia.'
                );
            }

            const inviteDoc = inviteQuery.docs[0];
            const invite = inviteDoc.data();

            // Walidacje stanu zaproszenia
            if (invite.used) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'Ten link został już wykorzystany.'
                );
            }

            if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'Ten link wygasł. Poproś o nowy link.'
                );
            }

            const displayName = invite.displayName || email.split('@')[0] || 'Użytkownik';
            const role = invite.role || 'agent';

            let userRecord;

            // Jeśli w zaproszeniu jest podany uid, aktualizujemy istniejącego usera
            if (invite.uid) {
                console.log(`Aktualizacja istniejącego użytkownika z uid: ${invite.uid}`);
                userRecord = await admin.auth().updateUser(invite.uid, {
                    email,
                    password,
                    displayName
                });
            } else {
                // W przeciwnym razie tworzymy nowe konto (zachowanie wsteczne)
                console.log('Tworzenie nowego użytkownika na podstawie zaproszenia');
                userRecord = await admin.auth().createUser({
                    email,
                    password,
                    displayName
                });
            }

            const uid = userRecord.uid;

            // Zadbaj o dokument w kolekcji users
            const userRef = db.collection('users').doc(uid);
            await userRef.set({
                uid,
                email,
                displayName,
                role,
                isOnline: false,
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Oznacz zaproszenie jako użyte
            await inviteDoc.ref.update({
                used: true,
                usedBy: email,
                usedAt: new Date().toISOString(),
                uid
            });

            return { success: true, uid };
        } catch (error) {
            console.error('Błąd completeInviteRegistration:', error);

            // Jeśli to już jest HttpsError – przekaż dalej bez zmian
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            // Mapowanie typowych błędów Firebase Auth na czytelniejsze komunikaty
            if (error.code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError(
                    'already-exists',
                    'Ten adres email jest już zarejestrowany.'
                );
            }

            if (error.code === 'auth/invalid-password') {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    'Hasło jest zbyt słabe. Użyj silniejszego hasła.'
                );
            }

            if (error.code === 'auth/invalid-email') {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    'Nieprawidłowy adres email.'
                );
            }

            if (error.code === 'auth/user-not-found') {
                throw new functions.https.HttpsError(
                    'not-found',
                    'Konto przypisane do tego zaproszenia nie istnieje.'
                );
            }

            // Fallback – nieznany błąd
            throw new functions.https.HttpsError(
                'internal',
                'Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.'
            );
        }
    });


// ============================================================
// FUNKCJA 5: Meta Lead Ads Webhook (NOWA)
// ============================================================

// Token weryfikacyjny — wpisz ten sam w panelu Meta Developer
const META_VERIFY_TOKEN = "kwzd_meta_webhook_2026";

// Helper: pobiera pełne dane leada z Meta Graph API
async function fetchMetaLeadData(leadgenId) {
    try {
        const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
        if (!accessToken) {
            console.error("Brak META_PAGE_ACCESS_TOKEN!");
            return null;
        }

        const url = `https://graph.facebook.com/v25.0/${leadgenId}?access_token=${accessToken}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Graph API error ${response.status}:`, errorText);
            return null;
        }

        const data = await response.json();
        console.log("Dane leada z Meta:", JSON.stringify(data));

        // Parsuj pola formularza do prostego obiektu
        const fields = {};
        for (const item of data.field_data || []) {
            fields[item.name] = item.values?.[0] || "";
        }

        // Złóż imię i nazwisko
        let name = fields.full_name || "";
        if (!name && (fields.first_name || fields.last_name)) {
            name = `${fields.first_name || ""} ${fields.last_name || ""}`.trim();
        }

        return {
            name,
            phone: fields.phone_number || "",
            email: fields.email || "",
            created_time: data.created_time || null,
            customAnswers: fields,
        };
    } catch (error) {
        console.error("Błąd fetchMetaLeadData:", error);
        return null;
    }
}

exports.metaLeadWebhook = functions
    .region("us-central1")
    .runWith({
        secrets: ["META_PAGE_ACCESS_TOKEN"],
        memory: "256MB",
        timeoutSeconds: 30,
    })
    .https.onRequest(async (req, res) => {

        // ---- GET = Meta weryfikuje webhook ----
        if (req.method === "GET") {
            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challenge = req.query["hub.challenge"];

            if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
                console.log("Meta webhook zweryfikowany!");
                return res.status(200).send(challenge);
            }
            console.warn("Nieudana weryfikacja webhooka:", { mode, token });
            return res.status(403).send("Forbidden");
        }

        // ---- POST = nowy lead z formularza ----
        if (req.method === "POST") {
            const body = req.body;

            if (body.object !== "page") {
                return res.status(404).send("Not a page event");
            }

            // Odpowiedz Meta natychmiast — masz max 20s
            res.status(200).send("EVENT_RECEIVED");

            // Przetwarzaj leady w tle
            try {
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.field !== "leadgen") continue;

                        const leadgenId = change.value.leadgen_id;
                        const formId = change.value.form_id;
                        const pageId = change.value.page_id;
                        const createdTime = change.value.created_time;

                        console.log(`>>> Nowy lead! leadgen_id=${leadgenId}, form_id=${formId}, page_id=${pageId}`);

                        // Pobierz pełne dane leada z Graph API
                        const leadData = await fetchMetaLeadData(leadgenId);

                        if (!leadData) {
                            console.error(`Nie udało się pobrać danych dla leada ${leadgenId}`);
                            // Zapisz surowe dane żeby nie stracić leada
                            await db.collection("leadsQueue").add({
                                name: "",
                                phone: "",
                                email: "",
                                source: "Meta Ads",
                                notes: `Formularz: ${formId} | Nie udało się pobrać danych z Graph API`,
                                metaLeadId: String(leadgenId),
                                metaCreatedTime: createdTime ? new Date(createdTime * 1000).toISOString() : null,
                                formAnswer: null,
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                            continue;
                        }

                        // Wrzuć do leadsQueue → triggeruje processLeadFromQueue (Funkcja 3)
                        await db.collection("leadsQueue").add({
                            name: leadData.name,
                            phone: leadData.phone,
                            email: leadData.email,
                            source: "Meta Ads",
                            notes: `Formularz: ${formId}`,
                            metaLeadId: String(leadgenId),
                            metaCreatedTime: leadData.created_time || null,
                            formAnswer: leadData.customAnswers || null,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });

                        console.log(`Lead ${leadgenId} (${leadData.name}) dodany do kolejki`);
                    }
                }
            } catch (error) {
                // Logujemy ale NIE zwracamy błędu — już wysłaliśmy 200
                console.error("Błąd przetwarzania webhooka:", error);
            }

            return;
        }

        return res.status(405).send("Method not allowed");
    });

// ============================================================
// FUNKCJA 6: Endpoint HTTP dla Google Sheets (leady z arkusza)
// ============================================================

// Token autoryzacyjny - ten sam wpisz w Apps Script (Script Properties)
const SHEETS_AUTH_TOKEN = "kwzd_sheets_2026_a9f3k2mxQ7pL";

exports.addLeadFromSheet = functions
    .region("us-central1")
    .runWith({
        memory: "256MB",
        timeoutSeconds: 30,
    })
    .https.onRequest(async (req, res) => {
        // CORS
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            return res.status(204).send("");
        }

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        // Auth
        const authHeader = req.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();

        if (token !== SHEETS_AUTH_TOKEN) {
            console.warn("Nieprawidłowy token Sheets:", token.substring(0, 10));
            return res.status(401).json({ error: "Unauthorized" });
        }

        try {
            const data = req.body || {};
            const { name, phone, email, source, formName, campaignName, customAnswers, sheetRowId } = data;

            // Walidacja minimum danych
            if (!phone && !email) {
                return res.status(400).json({ error: "Brak phone i email" });
            }

            // Normalizacja telefonu (dodaj + jeśli zaczyna się od 48)
            let normalizedPhone = (phone || "").toString().trim().replace(/\s+/g, "");
            if (normalizedPhone && !normalizedPhone.startsWith("+")) {
                if (normalizedPhone.startsWith("48") && normalizedPhone.length === 11) {
                    normalizedPhone = "+" + normalizedPhone;
                } else if (normalizedPhone.length === 9) {
                    normalizedPhone = "+48" + normalizedPhone;
                }
            }

            // Dedup po telefonie lub emailu w kolekcji leads
            if (normalizedPhone) {
                const existingByPhone = await db
                    .collection("leads")
                    .where("phone", "==", normalizedPhone)
                    .limit(1)
                    .get();

                if (!existingByPhone.empty) {
                    console.log(`Duplikat (telefon): ${normalizedPhone}`);
                    return res.status(200).json({
                        success: true,
                        duplicate: true,
                        message: "Lead już istnieje (telefon)",
                        existingId: existingByPhone.docs[0].id,
                    });
                }
            }

            if (email) {
                const existingByEmail = await db
                    .collection("leads")
                    .where("email", "==", email.toLowerCase().trim())
                    .limit(1)
                    .get();

                if (!existingByEmail.empty) {
                    console.log(`Duplikat (email): ${email}`);
                    return res.status(200).json({
                        success: true,
                        duplicate: true,
                        message: "Lead już istnieje (email)",
                        existingId: existingByEmail.docs[0].id,
                    });
                }
            }

            // Zbuduj czytelne notes z customAnswers
            let notesText = "";
            if (customAnswers && typeof customAnswers === "object") {
                const parts = [];
                const debt = customAnswers["jaka_jest_przybliżona_suma_twoich_wszystkich_zadłużeń?"]
                    || customAnswers["jaka_jest_przybliżona_suma_twoich_wszystkich_zadłużeń"]
                    || customAnswers.debtAmount;
                const bailiff = customAnswers["czy_masz_zajęcia_komornicze?"]
                    || customAnswers["czy_masz_zajęcia_komornicze"]
                    || customAnswers.bailiff;

                if (debt) parts.push(`Przybliżona kwota zadłużeń: ${debt}`);
                if (bailiff) parts.push(`Zajęcia komornicze: ${bailiff}`);

                // Dorzuć pozostałe pola które nie zostały użyte
                for (const [key, value] of Object.entries(customAnswers)) {
                    if (!value) continue;
                    if (key.includes("zadłużeń") || key.includes("komornicze") || key === "debtAmount" || key === "bailiff") continue;
                    parts.push(`${key}: ${value}`);
                }

                notesText = parts.join(" ");
            }

            // Normalizuj klucze customAnswers (lowercase, bez znaków zapytania)
            const normalizedAnswers = {};
            if (customAnswers && typeof customAnswers === "object") {
                for (const [key, value] of Object.entries(customAnswers)) {
                    if (!value) continue;
                    // Usuń znaki zapytania z końca i ewentualne spacje
                    const cleanKey = key.trim().replace(/\?+$/, "");
                    normalizedAnswers[cleanKey] = value.toString();
                }
            }

            // Wrzuć do leadsQueue - trigger processLeadFromQueue przerobi to na lead
            await db.collection("leadsQueue").add({
                name: (name || "").toString().trim(),
                phone: normalizedPhone,
                email: (email || "").toLowerCase().trim(),
                source: source || campaignName || "Google Sheets Import",
                notes: "",  // pusto - UI renderuje karty z formAnswer
                metaLeadId: null,
                metaCreatedTime: null,
                formAnswer: Object.keys(normalizedAnswers).length > 0 ? normalizedAnswers : null,
                sheetRowId: sheetRowId || null,
                importedFrom: "google_sheets",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Lead z arkusza dodany do kolejki: ${name || email || phone}`);

            return res.status(200).json({
                success: true,
                duplicate: false,
                message: "Lead dodany do kolejki",
            });
        } catch (error) {
            console.error("Błąd addLeadFromSheet:", error);
            return res.status(500).json({
                error: "Internal error",
                message: error.message,
            });
        }
    });
// ============================================================
// MODU� PHONE (Twilio Voice)  odseparowany w ./phone/
// ============================================================
Object.assign(exports, require('./phone'));

