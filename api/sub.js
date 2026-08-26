export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const {
            fullname,
            email,
            education,
            present_address,
            permanent_address,
            phone,
            occupation,
            past_experience,
            tshirt_size,
            nid_name,
            nid_data,
            video_name,
            video_data
        } = req.body;

        const BOT_TOKEN = "8956969370:AAEfyW5riRwYHxjeJl6MNxSKf8oY7M5IxZI";
        const GROUP_ID = "-5415150168";

        // Format message for Telegram
        const message = `🚨 *New CSIT Member Application* 🚨\n\n` +
            `👤 *Full Name:* ${fullname}\n` +
            `📧 *Gmail:* ${email}\n` +
            `🎓 *Education:* ${education}\n` +
            `🏠 *Present Address:* ${present_address}\n` +
            `🏡 *Permanent Address:* ${permanent_address}\n` +
            `📱 *Phone:* ${phone}\n` +
            `💼 *Occupation:* ${occupation}\n` +
            `📜 *Experience Status:* ${past_experience}\n` +
            `👕 *T-Shirt Size:* ${tshirt_size}\n`;

        // Send text message to Telegram group
        const textUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const textResponse = await fetch(textUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: GROUP_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const textResult = await textResponse.json();
        if (!textResult.ok) {
            throw new Error(textResult.description || "Failed to send message to Telegram");
        }

        // Helper function to send files to Telegram
        async function sendFileToTelegram(fileData, fileName, caption, isVideo = false) {
            if (!fileData) return;
            
            const base64Content = fileData.split(';base64,').pop();
            const buffer = Buffer.from(base64Content, 'base64');

            const formData = new FormData();
            formData.append('chat_id', GROUP_ID);
            formData.append('caption', caption);
            
            const blob = new Blob([buffer]);
            formData.append(isVideo ? 'video' : 'document', blob, fileName);

            const endpoint = isVideo ? 'sendVideo' : 'sendDocument';
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
                method: 'POST',
                body: formData
            });
        }

        // Send NID and Video to Telegram group
        if (nid_data) {
            await sendFileToTelegram(nid_data, nid_name || 'nid.jpg', `NID/Birth Certificate of ${fullname}`);
        }
        if (video_data) {
            await sendFileToTelegram(video_data, video_name || 'video.mp4', `Oath Video of ${fullname}`, true);
        }

        return res.status(200).json({ success: true, message: 'Application submitted successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
