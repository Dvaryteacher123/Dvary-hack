import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { makeWASocket, useMultiFileAuthState } from "baileys";
import Pino from "pino";
import path from "path";
import fs from "fs";

interface PairingBody {
    phoneNumber: string;
}

// Hifadhi ya muda ya pairing codes kwa kila namba
let pairingCodes: { [key: string]: string } = {};

export async function pairingRoutes(fastify: FastifyInstance) {
    fastify.post("/api/get-pair", async (request: FastifyRequest<{ Body: PairingBody }>, reply: FastifyReply) => {
        const { phoneNumber } = request.body;

        if (!phoneNumber) {
            return reply.status(400).send({
                success: false,
                message: "Tafadhali weka namba ya simu!"
            });
        }

        const formattedPhone = String(phoneNumber).replace(/[^0-9]/g, "");

        if (!formattedPhone || formattedPhone.length < 10) {
            return reply.status(400).send({
                success: false,
                message: "Namba ya simu si sahihi."
            });
        }

        try {
            // Weka mahali pa kuhifadhi session ya muda kwa ajili ya namba hii
            const sessionDir = path.join(process.cwd(), "temp", "sessions", formattedPhone);
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: Pino({ level: "silent" }).child({ level: "silent" }),
            });

            sock.ev.on('creds.update', saveCreds);

            // Omba Pairing Code kama namba haijasajiliwa bado
            if (!sock.authState.creds.registered) {
                setTimeout(async () => {
                    try {
                        const code = await sock.requestPairingCode(formattedPhone);
                        pairingCodes[formattedPhone] = code;
                    } catch (err) {
                        console.error("Imeshindwa kutoa pairing code:", err);
                    }
                }, 3000);
            }

            sock.ev.on('connection.update', (update) => {
                const { connection } = update;
                if (connection === 'open') {
                    console.log(`Bot imeunganishwa mafanikio kwa namba: ${formattedPhone}`);
                    // Safisha session folder ikiwa imeunganishwa kikamilifu kama unataka
                }
            });

            // Subiri sekunde chache ili code ipatikane kisha mtumie mteja kwenye tovuti
            await new Promise((resolve) => setTimeout(resolve, 6000));

            const code = pairingCodes[formattedPhone] || "Subiri kidogo au jaribu tena...";

            return reply.send({
                success: true,
                pairingCode: code,
                message: "Pairing code imetengenezwa kikamilifu."
            });

        } catch (error) {
            console.error("Pairing error:", error);
            return reply.status(500).send({
                success: false,
                message: "Imeshindwa kutengeneza pairing code kwa sasa."
            });
        }
    });
}

