export interface UserProcessResult<T = any> {
    userId: number;
    success: boolean;
    data?: T;
    error?: string;
}

export interface BatchProcessResult<T = any> {
    totalUsers: number;
    successful: number;
    failed: number;
    results: UserProcessResult<T>[];
}