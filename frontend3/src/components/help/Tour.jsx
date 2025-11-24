// src/components/help/Tour.jsx
import React, { useLayoutEffect, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHelp } from '../../context/HelpContext';
import { useLocation } from 'react-router-dom';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

const Tour = () => {
    // Get location from useHelp context
    const { isTourActive, tourSteps, currentStep, nextStep, prevStep, endTour } = useHelp();
    const [targetRect, setTargetRect] = useState(null);
    const location = useLocation(); // Get current location

    const step = tourSteps[currentStep];

    useLayoutEffect(() => {
        if (!isTourActive || !step) return; // Ensure tour is active and step exists

        if (step.selector === '__NO_SELECTOR__') {
            const mockRect = {
                width: 2, // Small placeholder size for the highlight
                height: 2,
                top: window.innerHeight / 2 - 1,
                left: window.innerWidth / 2 - 1,
                x: window.innerWidth / 2 - 1,
                y: window.innerHeight / 2 - 1,
                right: window.innerWidth / 2 + 1,
                bottom: window.innerHeight / 2 + 1,
            };
            setTargetRect(mockRect);
            return; // Exit early
        }

        const targetElement = document.querySelector(step.selector);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            // Basic validation for rect: treat elements with zero dimensions as not found
            if (rect.width === 0 || rect.height === 0 || rect.top === undefined || rect.left === undefined) {
                 console.warn(`[Tour] Invalid targetRect dimensions for selector: ${step.selector}. Advancing.`);
                 setTargetRect(null); // Treat as not found if dimensions are invalid
                 const timer = setTimeout(() => {
                     nextStep();
                 }, 100); 
                 return () => clearTimeout(timer);
            }

            setTargetRect(rect);
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } else {
            console.warn(`[Tour] Element NOT found for selector: ${step.selector}. Clearing targetRect and advancing.`);
            setTargetRect(null); // CRITICAL: Clear targetRect when element is not found
            const timer = setTimeout(() => {
                nextStep();
            }, 100); 
            return () => clearTimeout(timer); // Cleanup timeout to avoid memory leaks
        }
    }, [isTourActive, currentStep, step, nextStep]); // Added isTourActive to deps

    // Effect to handle navigation for steps with 'navigatesTo'
    useEffect(() => {
        if (isTourActive && step && step.navigatesTo) {
            // Check if the current URL matches the expected navigation target
            // We use startsWith for flexibility with dynamic IDs in routes
            if (location.pathname.startsWith(step.navigatesTo)) {
                console.log(`[Tour] Detected navigation to ${location.pathname}. Advancing tour.`);
                nextStep();
            }
        }
    }, [location.pathname, isTourActive, step, nextStep]);


    if (!targetRect || !step) {
        return null;
    }

    const isLastStep = currentStep === tourSteps.length - 1;
    let isPopoverAbove = targetRect.top > window.innerHeight / 2;

    const POPOVER_WIDTH = 320;
    const screenPadding = 16;

    let verticalPositionStyle = {};
    if (targetRect.height > window.innerHeight * 0.8) {
        verticalPositionStyle = { bottom: `${screenPadding}px` };
        isPopoverAbove = true;
    } else if (isPopoverAbove) {
        verticalPositionStyle = { bottom: `${window.innerHeight - targetRect.top + 10}px` };
    } else {
        verticalPositionStyle = { top: `${targetRect.bottom + 10}px` };
    }

    let left = targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2;
    
    if (left < screenPadding) {
        left = screenPadding;
    }
    if (left + POPOVER_WIDTH > window.innerWidth - screenPadding) {
        left = window.innerWidth - POPOVER_WIDTH - screenPadding;
    }

    const popoverStyle = {
        position: 'fixed',
        left: `${left}px`,
        ...verticalPositionStyle,
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[100]"
                onClick={endTour}
            />

            <motion.div
                animate={{ 
                    top: targetRect.top,
                    left: targetRect.left,
                    width: targetRect.width,
                    height: targetRect.height,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed box-border rounded-lg bg-transparent z-[101]"
                style={{
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                }}
            />

            <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: isPopoverAbove ? -20 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={popoverStyle}
                className="fixed z-[102] w-80 max-w-[90vw] bg-secondary border border-theme rounded-lg shadow-2xl p-4"
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-accent text-lg">{step.title}</h3>
                    <button onClick={endTour} className="p-1 rounded-full text-secondary hover:text-primary">
                        <X size={20} />
                    </button>
                </div>
                <p className="text-primary text-sm mb-4">{step.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-tertiary">
                        Paso {currentStep + 1} de {tourSteps.length}
                    </span>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button onClick={prevStep} className="flex items-center gap-1 px-3 py-1 rounded-lg text-primary hover:bg-tertiary">
                                <ArrowLeft size={16} /> Atrás
                            </button>
                        )}
                        {step.navigatesTo ? (
                            <button
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-white opacity-50 cursor-not-allowed"
                                disabled
                            >
                                Haz clic en la fila
                            </button>
                        ) : (
                            <button onClick={nextStep} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-white">
                                {isLastStep ? 'Finalizar' : 'Siguiente'}
                                {!isLastStep && <ArrowRight size={16} />}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default Tour;

