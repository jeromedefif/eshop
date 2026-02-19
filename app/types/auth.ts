import { User } from '@supabase/supabase-js';

export interface AuthError extends Error {
   message: string;
   status?: number;
}

export interface UserProfile {
   id: string;
   email: string;
   full_name: string | null;
   company: string | null;
   phone: string | null;
   address: string | null;
   city: string | null;
   postal_code: string | null;
   is_admin: boolean;
   last_sign_in_at?: string | null;
   created_at: string;
   updated_at: string;
}

export interface SignUpData {
   email: string;
   password: string;
   metadata: {
       full_name: string;
       company: string;
       phone: string;
       address: string;
       city: string;
       postal_code?: string;
   };
}

export interface UpdateProfileData {
   full_name?: string;
   company?: string;
   phone?: string;
   address?: string;
   city?: string;
   postal_code?: string;
}

export interface AuthContextType {
   user: User | null;
   profile: UserProfile | null;
   isLoading: boolean;
   isInitialized: boolean;
   isAdmin: boolean;
   signIn: (email: string, password: string) => Promise<void>;
   signUp: (data: SignUpData) => Promise<void>;
   signOut: () => Promise<void>;
   updateProfile: (data: UpdateProfileData) => Promise<void>;
   refreshProfile: () => Promise<void>;
   forgotPassword: (email: string) => Promise<void>;
   resetPassword: (newPassword: string) => Promise<void>;
}

export interface ProfileDialogProps {
   isOpen: boolean;
   onClose: () => void;
}

export interface RegistrationDialogProps {
   isOpen: boolean;
   onClose: () => void;
}

export interface ProfileFormData {
   full_name: string;
   company: string;
   phone: string;
   address: string;
   city: string;
}

export interface RegistrationFormData {
   email: string;
   password: string;
   confirmPassword: string;
   full_name: string;
   company: string;
   phone: string;
   address: string;
   city: string;
   postal_code: string;
}
