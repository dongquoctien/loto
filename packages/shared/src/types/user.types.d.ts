export interface UserData {
    id: number;
    username: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    qrCodeUrl: string | null;
    isActive: boolean;
    createdAt: string;
}
export interface UserPublic {
    id: number;
    displayName: string;
    avatarUrl: string | null;
}
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    displayName: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface AuthResponse {
    accessToken: string;
    user: UserData;
}
export interface UpdateUserRequest {
    displayName?: string;
}
