import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';
import { Post } from '../src/models/Post.js';
import { User } from '../src/models/User.js';
import {
  groupByInterestsPipeline,
  postsByUserPipeline,
} from '../src/modules/users/user.pipelines.js';

const uri =
  process.env.EXPLAIN_MONGODB_URI ||
  'mongodb://127.0.0.1:27017/notes_api_explain?replicaSet=rs0';

function winningPlanName(plan) {
  if (!plan) {
    return null;
  }

  if (plan.indexName) {
    return plan.indexName;
  }

  if (plan.inputStage) {
    return winningPlanName(plan.inputStage);
  }

  if (plan.inputStages) {
    return plan.inputStages.map(winningPlanName).find(Boolean) || null;
  }

  return null;
}

function summarizeFind(label, explain) {
  const winningPlan = explain.queryPlanner.winningPlan;

  return {
    label,
    planStage: winningPlan.stage,
    indexName: winningPlanName(winningPlan),
    docsExamined: explain.executionStats.totalDocsExamined,
    docsReturned: explain.executionStats.nReturned,
    executionTimeMillis: explain.executionStats.executionTimeMillis,
  };
}

function summarizeAggregate(label, explain) {
  const cursorStage = explain.stages?.find((stage) => stage.$cursor);
  const winningPlan = cursorStage?.$cursor?.queryPlanner?.winningPlan;
  const stats = cursorStage?.$cursor?.executionStats;

  return {
    label,
    planStage: winningPlan?.stage ?? null,
    indexName: winningPlanName(winningPlan),
    docsExamined: stats?.totalDocsExamined ?? null,
    docsReturned: stats?.nReturned ?? null,
  };
}

async function seed(userId, passwordHash) {
  const users = Array.from({ length: 50 }, (_, index) => ({
    name: `User ${index}`,
    email: `explain-user-${index}@example.com`,
    password: passwordHash,
    role: index === 0 ? 'admin' : 'user',
    interests: [
      index % 2 === 0 ? 'chess' : 'reading',
      index % 3 === 0 ? 'running' : 'cooking',
    ],
  }));

  const createdUsers = await User.insertMany(users);
  const ownerId = createdUsers[0]._id;

  const notes = Array.from({ length: 500 }, (_, index) => ({
    title: `Note ${index}`,
    content: `Body ${index}`,
    owner: createdUsers[index % createdUsers.length]._id,
    createdAt: new Date(Date.now() - index * 60_000),
    updatedAt: new Date(Date.now() - index * 60_000),
  }));

  const posts = Array.from({ length: 500 }, (_, index) => ({
    title: `Post ${index}`,
    content: `Body ${index}`,
    author: createdUsers[index % createdUsers.length]._id,
    createdAt: new Date(Date.now() - index * 60_000),
    updatedAt: new Date(Date.now() - index * 60_000),
  }));

  await Note.insertMany(notes);
  await Post.insertMany(posts);

  return ownerId ?? userId;
}

async function run() {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([User.syncIndexes(), Note.syncIndexes(), Post.syncIndexes()]);

  const passwordHash = await bcrypt.hash('Password123!', 4);
  const ownerId = await seed(null, passwordHash);

  const results = [];

  results.push(
    summarizeFind(
      'notes by owner, newest first',
      await Note.find({ owner: ownerId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .explain('executionStats'),
    ),
  );

  results.push(
    summarizeFind(
      'admin all notes, newest first',
      await Note.find()
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .explain('executionStats'),
    ),
  );

  results.push(
    summarizeFind(
      'admin users, newest first',
      await User.find()
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .explain('executionStats'),
    ),
  );

  results.push(
    summarizeAggregate(
      'group users by interests',
      await User.aggregate(
        groupByInterestsPipeline({ skip: 0, limit: 20, interest: null }),
      ).explain('executionStats'),
    ),
  );

  results.push(
    summarizeAggregate(
      'group users by one interest',
      await User.aggregate(
        groupByInterestsPipeline({ skip: 0, limit: 20, interest: 'chess' }),
      ).explain('executionStats'),
    ),
  );

  results.push(
    summarizeAggregate(
      'posts by user ($lookup)',
      await User.aggregate(
        postsByUserPipeline({ userId: ownerId, skip: 0, limit: 20 }),
      ).explain('executionStats'),
    ),
  );

  results.push(
    summarizeFind(
      'posts by author, newest first',
      await Post.find({ author: ownerId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .explain('executionStats'),
    ),
  );

  console.log(JSON.stringify(results, null, 2));

  await mongoose.connection.dropDatabase();
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
