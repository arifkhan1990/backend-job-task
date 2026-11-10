# Query plan evidence

`npm run explain` creates a scratch database (`notes_api_explain` by default), inserts 50 users, 500 notes and 500 posts, runs `EXPLAIN('executionStats')` against the real query shapes, prints a summary and drops the scratch database.

Override the target with `EXPLAIN_MONGODB_URI` if needed. The script never touches the application database.

## Result

| Query | Winning plan | Index | Docs examined | Docs returned |
| --- | --- | --- | ---: | ---: |
| Notes by owner, newest first | `LIMIT` → `IXSCAN` | `owner_1_createdAt_-1__id_-1` | 10 | 10 |
| Admin all notes, newest first | `LIMIT` → `IXSCAN` | `createdAt_-1__id_-1` | 20 | 20 |
| Admin users, newest first | `LIMIT` → `IXSCAN` | `createdAt_-1__id_-1` | 20 | 20 |
| Group users by interests (all) | `PROJECTION_SIMPLE` | none (blocking `$group`) | 50 | 50 |
| Group users by one interest | `PROJECTION_SIMPLE` | `interests_1` | 25 | 25 |
| Posts by user (`$lookup`) | `EXPRESS_IXSCAN` on users | `_id_` | 1 | 1 |
| Posts by author, newest first | `LIMIT` → `IXSCAN` | `author_1_createdAt_-1__id_-1` | 10 | 10 |

Raw output is reproducible with:

```bash
npm run explain
```

## Interpretation

- The owner note list does an index range scan on `owner`, then reads the index order for `createdAt` and `_id`; it does not build an in-memory sort. Each of the 50 users owns 10 notes, so the 20-row page returns all 10 available rows.
- The admin note list and admin user list both use their `createdAt + _id` compound index. The `_id` suffix is the stable tie-breaker for equal timestamps.
- Grouping every user by interest is a blocking `$group`; no index can return pre-grouped results. The 50-document collection scan is expected.
- Filtering to one interest uses the multikey `interests_1` index before `$unwind`, reducing the scan from 50 to 25 users.
- The `$lookup` starts with one user via `_id`, then uses `posts.author + createdAt + _id` for the inner lookup and sort. The outer explain only shows the user match; the last row verifies the inner index directly.
- `executionTimeMillis` is `0` at this dataset size and is not a benchmark. The important signal is `docsExamined` vs `docsReturned` and the chosen index.

## Deliberately absent

- No index on `role`: only a rare admin-count guard uses it.
- No text index on note title/content: no search endpoint.
- No all-posts feed index: posts are only read per author.
- No soft-delete index: hard delete is the documented assignment scope.
