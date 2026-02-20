import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Smartphone, Plus, Trash2, Power, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TelegramDestination {
    id: number;
    chat_id: string;
    chat_name: string;
    chat_type: string;
    is_active: boolean;
    created_at: string;
}

export const TelegramDestinationsManager = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newChatId, setNewChatId] = useState('');
    const [newChatName, setNewChatName] = useState('');
    const [newChatType, setNewChatType] = useState('group');

    const { data: destinations = [], refetch } = useQuery<TelegramDestination[]>(
        ['telegram-destinations'],
        async () => {
            const { data } = await axios.get('/api/admin/telegram-destinations');
            return data.destinations || [];
        }
    );

    const { data: recentChats = [] } = useQuery(
        ['telegram-chats'],
        async () => {
            const { data } = await axios.get('/api/admin/telegram-chats');
            return data.chats || [];
        }
    );

    const addMutation = useMutation(
        async (destination: { chat_id: string; chat_name: string; chat_type: string }) => {
            await axios.post('/api/admin/telegram-destinations', destination);
        },
        {
            onSuccess: () => {
                toast.success('Destino agregado correctamente 📱');
                refetch();
                setShowAddForm(false);
                setNewChatId('');
                setNewChatName('');
            },
            onError: () => toast.error('Error al agregar destino'),
        }
    );

    const toggleMutation = useMutation(
        async ({ id, is_active }: { id: number; is_active: boolean }) => {
            await axios.put('/api/admin/telegram-destinations', { id, is_active });
        },
        {
            onSuccess: () => {
                toast.success('Estado actualizado');
                refetch();
            },
        }
    );

    const deleteMutation = useMutation(
        async (id: number) => {
            await axios.delete('/api/admin/telegram-destinations', { data: { id } });
        },
        {
            onSuccess: () => {
                toast.success('Destino eliminado');
                refetch();
            },
        }
    );

    const handleAddFromRecent = (chat: any) => {
        setNewChatId(String(chat.id));
        setNewChatName(chat.title || chat.first_name || 'Chat sin nombre');
        setNewChatType(chat.type || 'group');
        setShowAddForm(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <Users size={20} className="text-blue-600" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            Destinos de Notificación
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Broadcast Multi-Chat
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Plus size={14} strokeWidth={3} />
                    Agregar Destino
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-4">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider">
                        Nuevo Destino
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[9px] uppercase tracking-wider font-black text-gray-400 mb-2 block">
                                Chat ID
                            </label>
                            <input
                                type="text"
                                value={newChatId}
                                onChange={(e) => setNewChatId(e.target.value)}
                                placeholder="-1002360814917"
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] uppercase tracking-wider font-black text-gray-400 mb-2 block">
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={newChatName}
                                onChange={(e) => setNewChatName(e.target.value)}
                                placeholder="Grupo de Alertas"
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] uppercase tracking-wider font-black text-gray-400 mb-2 block">
                                Tipo
                            </label>
                            <select
                                value={newChatType}
                                onChange={(e) => setNewChatType(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                            >
                                <option value="group">Grupo</option>
                                <option value="private">Privado</option>
                                <option value="channel">Canal</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => addMutation.mutate({ chat_id: newChatId, chat_name: newChatName, chat_type: newChatType })}
                            disabled={!newChatId || !newChatName || addMutation.isLoading}
                            className="px-6 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {addMutation.isLoading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewChatId('');
                                setNewChatName('');
                            }}
                            className="px-6 py-2 rounded-xl bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-wider hover:bg-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>

                    {/* Recent Chats Quick Add */}
                    {recentChats.length > 0 && (
                        <div className="pt-4 border-t border-blue-200">
                            <p className="text-[9px] uppercase tracking-wider font-black text-gray-400 mb-3">
                                Chats Recientes (Click para agregar)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {recentChats.slice(0, 5).map((chat: any) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleAddFromRecent(chat)}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-xs font-bold text-gray-700 transition-all"
                                    >
                                        {chat.title || chat.first_name || `Chat ${chat.id}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Destinations List */}
            <div className="space-y-3">
                {destinations.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-200">
                        <Smartphone className="mx-auto mb-3 text-gray-300" size={32} strokeWidth={1.5} />
                        <p className="text-sm text-gray-400 font-medium">
                            No hay destinos configurados
                        </p>
                    </div>
                ) : (
                    destinations.map((dest) => (
                        <div
                            key={dest.id}
                            className={`p-4 rounded-xl border transition-all ${dest.is_active
                                    ? 'bg-white border-emerald-200 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`p-2 rounded-lg ${dest.is_active ? 'bg-emerald-100' : 'bg-gray-200'
                                            }`}
                                    >
                                        <Smartphone
                                            size={18}
                                            className={dest.is_active ? 'text-emerald-600' : 'text-gray-400'}
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{dest.chat_name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] text-gray-400 font-mono font-bold">
                                                ID: {dest.chat_id}
                                            </p>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${dest.chat_type === 'group'
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : dest.chat_type === 'private'
                                                            ? 'bg-purple-100 text-purple-600'
                                                            : 'bg-cyan-100 text-cyan-600'
                                                    }`}
                                            >
                                                {dest.chat_type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            toggleMutation.mutate({ id: dest.id, is_active: !dest.is_active })
                                        }
                                        className={`p-2 rounded-lg transition-all ${dest.is_active
                                                ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                            }`}
                                        title={dest.is_active ? 'Desactivar' : 'Activar'}
                                    >
                                        <Power size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Eliminar este destino?')) {
                                                deleteMutation.mutate(dest.id);
                                            }
                                        }}
                                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stats */}
            {destinations.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total</p>
                        <p className="text-2xl font-black text-blue-700 mt-1">{destinations.length}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Activos</p>
                        <p className="text-2xl font-black text-emerald-700 mt-1">
                            {destinations.filter((d) => d.is_active).length}
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Inactivos</p>
                        <p className="text-2xl font-black text-gray-700 mt-1">
                            {destinations.filter((d) => !d.is_active).length}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
