import { NextApiRequest, NextApiResponse } from 'next';
import { logAudit } from '@/lib/audit';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const users = await prisma.usuarios.findMany({
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        rol: true
                    },
                    orderBy: { nombre: 'asc' }
                });
                return res.status(200).json({ status: 'success', users });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ status: 'error', message: 'Error loading users' });
            }

        case 'POST':
            try {
                const { nombre, email, password, rol } = req.body;

                if (!nombre || !email || !password) {
                    return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
                }

                // Check if user already exists
                const existingUser = await prisma.usuarios.findUnique({
                    where: { email }
                });

                if (existingUser) {
                    return res.status(400).json({ status: 'error', message: 'El correo ya está registrado' });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                const newUser = await prisma.usuarios.create({
                    data: {
                        nombre,
                        email,
                        password: hashedPassword,
                        rol: rol || 'usuario'
                    }
                });

                // Log Audit
                const session = await getServerSession(req, res, authOptions);
                await logAudit({
                    entity_type: 'USER',
                    entity_id: newUser.id,
                    action: 'CREATE',
                    user_id: session?.user?.id as any,
                    user_name: session?.user?.name || 'System',
                    description: `New user created: ${newUser.email} (${newUser.rol})`,
                    new_data: { nombre: newUser.nombre, email: newUser.email, rol: newUser.rol }
                });

                return res.status(201).json({ status: 'success', message: 'Usuario creado correctamente', user: { id: newUser.id, email: newUser.email } });
            } catch (error) {
                console.error('Error creating user:', error);
                return res.status(500).json({ status: 'error', message: 'Error al crear usuario' });
            }

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).end(`Method ${method} Not Allowed`);
    }
}
