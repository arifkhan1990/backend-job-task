import mongoose from 'mongoose';

export function groupByInterestsPipeline({ skip, limit, interest }) {
  const pipeline = [];

  if (interest) {
    pipeline.push({ $match: { interests: interest } });
  }

  pipeline.push(
    { $unwind: '$interests' },
    {
      $group: {
        _id: '$interests',
        userCount: { $sum: 1 },
        users: { $push: { _id: '$_id', name: '$name' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        interest: '$_id',
        userCount: 1,
        users: 1,
      },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: 'total' }],
      },
    },
  );

  return pipeline;
}

export function postsByUserPipeline({ userId, skip, limit }) {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        pipeline: [
          { $sort: { createdAt: -1, _id: -1 } },
          {
            $facet: {
              data: [{ $skip: skip }, { $limit: limit }],
              meta: [{ $count: 'total' }],
            },
          },
        ],
        as: 'postPage',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        page: { $arrayElemAt: ['$postPage', 0] },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        posts: { $ifNull: ['$page.data', []] },
        totalPosts: { $ifNull: [{ $arrayElemAt: ['$page.meta.total', 0] }, 0] },
      },
    },
  ];
}
