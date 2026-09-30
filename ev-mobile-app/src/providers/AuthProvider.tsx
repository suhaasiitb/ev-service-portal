import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  userType: 'rider' | 'b2c' | null;
  isLoading: boolean;
  checkUserType: (session: Session) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  userType: null,
  isLoading: true,
  checkUserType: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<'rider' | 'b2c' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserType(session);
      } else {
        setIsLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserType(session);
      } else {
        setUserType(null);
        setIsLoading(false);
      }
    });
  }, []);

  const checkUserType = async (session: Session) => {
    try {
      // 1. Check for Rider based on phone
      if (session.user.phone) {
        const cleanPhone = session.user.phone.replace(/\D/g, '').slice(-10);
        const { data } = await supabase
          .from('riders')
          .select('id')
          .eq('phone', cleanPhone)
          .single();
          
        if (data) {
          setUserType('rider');
          return;
        }
      }
      
      setUserType('b2c');
    } catch (e) {
      setUserType('b2c');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, userType, isLoading, checkUserType }}>
      {children}
    </AuthContext.Provider>
  );
};
