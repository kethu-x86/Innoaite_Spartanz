import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { simulationApi } from '../api/services/simulation';

interface SimulationContextType {
  isAutoRun: boolean;
  setIsAutoRun: (value: boolean) => void;
  tickSpeed: number;
  setTickSpeed: (value: number) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAutoRun, setIsAutoRun] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(1000);

  const stepMutation = useMutation({ mutationFn: simulationApi.step });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoRun) {
      interval = setInterval(() => {
        if (!stepMutation.isPending) {
          stepMutation.mutate();
        }
      }, tickSpeed);
    }
    return () => clearInterval(interval);
  }, [isAutoRun, tickSpeed, stepMutation]);

  return (
    <SimulationContext.Provider value={{ isAutoRun, setIsAutoRun, tickSpeed, setTickSpeed }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
