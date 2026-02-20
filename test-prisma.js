const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const notifications = await prisma.notifications.findMany({ take: 1 });
        console.log('✅ Success:', notifications);
    } catch (err) {
        console.error('❌ Error testing Prisma:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
