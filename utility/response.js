
export const ErrorResponse = (res, statusCode, message, errorObj) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errorObj || null, // Ensures errorObj is explicitly null if not provided
  });
};


export const SuccessResponse = (
  res,
  statusCode,
  message,
  data,
  paginationData,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    paginationData: paginationData && {
      ...paginationData,
      totalPages: Math.ceil(paginationData.total / paginationData.limit),
    },
  });
};
