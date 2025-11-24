// src/context/HelpContext.jsx
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { helpContent } from '../data/helpContent';
import Tour from '../components/help/Tour';

const HelpContext = createContext();

export const HelpProvider = ({ children }) => {
    const [isTourActive, setIsTourActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [tourSteps, setTourSteps] = useState([]);
    const [tourModule, setTourModule] = useState(null);

    const startTour = useCallback((moduleKey) => {
        const content = helpContent[moduleKey];
        if (content && content.tourSteps) {
            console.log(`Iniciando tour para ${moduleKey} con ${content.tourSteps.length} pasos.`);
            setTourSteps(content.tourSteps);
            setTourModule(moduleKey);
            setCurrentStep(0);
            setIsTourActive(true);
        } else {
            console.warn(`No se encontraron pasos de tour para el módulo: ${moduleKey}`);
        }
    }, []);

    const endTour = useCallback(() => {
        console.log("Finalizando tour.");
        setIsTourActive(false);
        setCurrentStep(0);
        setTourSteps([]);
        setTourModule(null);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour();
        }
    }, [currentStep, tourSteps.length, endTour]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const value = {
        isTourActive,
        startTour,
        endTour,
        nextStep,
        prevStep,
        currentStep,
        tourSteps,
        tourModule,
    };

    return (
        <HelpContext.Provider value={value}>
            {children}
            {isTourActive && tourSteps.length > 0 && <Tour />}
        </HelpContext.Provider>
    );
};

export const useHelp = () => {
    const context = useContext(HelpContext);
    if (!context) {
        throw new Error('useHelp debe ser usado dentro de un HelpProvider');
    }
    return context;
};
