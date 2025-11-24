// src/components/help/HelpButton.jsx
import React, { useState } from 'react';
import { HelpCircle, BookOpen, Route } from 'lucide-react';
import Modal from '../Modal';
import { useHelp } from '../../context/HelpContext';
import { helpContent } from '../../data/helpContent';

export default function HelpButton({ moduleKey }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { startTour } = useHelp();
    const content = helpContent[moduleKey];

    if (!content) {
        return null;
    }

    const handleStartTour = () => {
        setIsModalOpen(false);
        // Pequeño delay para asegurar que el modal se cierre antes de que el tour se inicie
        setTimeout(() => startTour(moduleKey), 150);
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-8 right-8 bg-accent text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-opacity-90 transition-all active:scale-90 transform hover:scale-110"
                title="Ayuda y Guía del Módulo"
            >
                <HelpCircle size={28} />
            </button>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={content.title}>
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3 text-primary mb-4">
                        <BookOpen size={24} className="text-accent" />
                        <h3 className="text-lg font-semibold">Guía Rápida</h3>
                    </div>
                    <div className="space-y-2 text-secondary text-sm max-h-60 overflow-y-auto pr-2">
                        {content.guide.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-theme">
                        <button
                            onClick={handleStartTour}
                            className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95"
                        >
                            <Route size={20} />
                            Iniciar Tour Guiado
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
