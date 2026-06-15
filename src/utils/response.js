export const success = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

export const created = (res, data = {}, message = 'Created successfully') =>
  success(res, data, message, 201);

export const paginated = (res, data, page, limit, total) =>
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
