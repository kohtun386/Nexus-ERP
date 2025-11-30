import React, { createContext, ReactNode, useContext } from 'react';
import { AuthContext } from './AuthContext';

type Currency = 'MMK' | 'USD' | 'THB';

interface FactoryContextType {
  currency: Currency;
  // In the future, this could include:
  // factoryProfile: Factory | null;
  // payrollCycle: 'weekly' | 'monthly';
}

export const FactoryContext = createContext<FactoryContextType>({
  currency: 'MMK', // Default currency
});

interface FactoryProviderProps {
  children: ReactNode;
}

/**
 * The FactoryProvider holds global settings related to the currently
 * logged-in user's factory, such as currency or other display settings.
 *
 * For now, it provides a static currency. In the future, this provider
 * would listen to the AuthContext and fetch the specific factory's
 * profile from Firestore.
 */
export const FactoryProvider: React.FC<FactoryProviderProps> = ({ children }) => {
  const { factoryId } = useContext(AuthContext);

  // In a real application, you would have a useEffect here:
  // useEffect(() => {
  //   if (factoryId) {
  //     // Fetch factory profile from Firestore using the factoryId
  //     // const factoryDoc = await getDoc(doc(db, 'factories', factoryId));
  //     // setCurrency(factoryDoc.data().currency);
  //   }
  // }, [factoryId]);

  const value = {
    currency: 'MMK' as Currency,
  };

  return (
    <FactoryContext.Provider value={value}>
      {children}
    </FactoryContext.Provider>
  );
};
