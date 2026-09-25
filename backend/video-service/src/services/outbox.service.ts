import prisma from "../config/prisma.js";
import { emitVideoEvent } from "../events/videoservice.producer.js";

let isPolling = false;

export const startOutboxPublisher = (intervalMs: number = 3000): void => {
    console.log(`📦 Transactional Outbox Publisher started (polling every ${intervalMs}ms)...`);

    setInterval(async () => {
        if (isPolling) return;
        isPolling = true;

        try {
            const pendingEvents = await prisma.outboxEvent.findMany({
                where: { status: "PENDING" },
                orderBy: { createdAt: "asc" },
                take: 20,
            });

            for (const event of pendingEvents) {
                try {
                    console.log(`📤 Outbox Flushing Event: ${event.eventType} (ID: ${event.id})`);
                    await emitVideoEvent(event.eventType, event.payload as Record<string, unknown>);

                    await prisma.outboxEvent.update({
                        where: { id: event.id },
                        data: {
                            status: "PUBLISHED",
                            processedAt: new Date(),
                        },
                    });
                } catch (err) {
                    const error = err as Error;
                    console.error(`❌ Failed to publish outbox event ${event.id}:`, error.message);
                    await prisma.outboxEvent.update({
                        where: { id: event.id },
                        data: { status: "FAILED" },
                    }).catch(() => {});
                }
            }
        } catch (error) {
            const err = error as Error;
            console.error("Outbox Poller Error:", err.message);
        } finally {
            isPolling = false;
        }
    }, intervalMs);
};
