import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connection } from 'config/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';

// Extend NextAuth definitions
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      rol?: string; // Custom property
    };
  }
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    rol?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    rol?: string;
  }
}

interface UserRow extends RowDataPacket {
  id: number;
  nombre: string;
  email: string;
  password?: string;
  rol: string;
}

export const authOptions: NextAuthOptions = {
  debug: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const [rows] = await connection.query<UserRow[]>(
            'SELECT * FROM usuarios WHERE email = ?',
            [credentials.email]
          );

          const user = rows[0];

          if (!user) return null;
          if (!user.password) return null;

          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) return null;

          return {
            id: user.id.toString(),
            name: user.nombre,
            email: user.email,
            rol: user.rol,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return baseUrl + '/performance';
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.rol = token.rol;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
