export type TResponse<T = unknown> = {
  success: boolean;
  message: string | string[];
  data: T;
};

export type TPaginatedResponse<T = unknown> = {
  success: boolean;
  message: string | string[];
  data: T[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
};
