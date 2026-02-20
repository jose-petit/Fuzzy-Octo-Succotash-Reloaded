const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando población de diccionario de enlaces (aliases)...');

    try {
        // 1. Obtener todos los enlaces configurados en data_firebase
        const enlacesRows = await prisma.data_firebase.findMany();
        console.log(`📦 Encontrados ${enlacesRows.length} registros en data_firebase`);

        const aliasMap = new Map();

        for (const row of enlacesRows) {
            let data;
            try {
                data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            } catch (e) {
                console.warn(`⚠️ Error al parsear JSON para id ${row.firebase_id}`);
                continue;
            }

            // Procesar enlace1 (Origen)
            if (data.enlace1 && data.name1) {
                const serial = String(data.enlace1).trim();
                const alias = String(data.name1).trim();
                if (serial && alias) {
                    aliasMap.set(serial, alias);
                }
            }

            // Procesar enlace2 (Destino) - Si no es standalone
            if (!data.isSingle && data.enlace2 && data.name2) {
                const serial = String(data.enlace2).trim();
                const alias = String(data.name2).trim();
                if (serial && alias) {
                    aliasMap.set(serial, alias);
                }
            }
        }

        console.log(`🔍 Se identificaron ${aliasMap.size} aliases únicos para procesar.`);

        let insertedCount = 0;
        let updatedCount = 0;

        for (const [serial, alias] of aliasMap.entries()) {
            try {
                await prisma.link_aliases.upsert({
                    where: { serial },
                    update: { alias, updated_at: new Date() },
                    create: { serial, alias, updated_at: new Date() },
                });
                insertedCount++;
            } catch (err) {
                console.error(`❌ Error al procesar serial ${serial}:`, err.message);
            }
        }

        console.log(`✅ Población completada: ${insertedCount} registros procesados.`);
    } catch (error) {
        console.error('💥 Error crítico durante la población:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
