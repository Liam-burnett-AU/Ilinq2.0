# Schoolbox API usage

Source of truth: [alaress/schoolbox-api-docs](https://github.com/alaress/schoolbox-api-docs)
(OpenAPI, `develop` branch, Schoolbox 26.x). Base URL for Sheldon College:
`https://ilinq.sheldoncollege.com`. Every request sends `Accept: application/json`
so errors arrive as RFC 7807 `application/problem+json`.

## Authentication

| Mode | How | Notes |
|---|---|---|
| Session | `POST /api/session` form fields `username`, `password` (or `jwt`) → 200 JSON `{id,key,role,username}` + `Set-Cookie: PHPSESSID` | Needs same origin / proxy. 401 body is a plain string. |
| Bearer | `Authorization: Bearer <JWT>` | Token from `POST /user/token` `{name, scopes[], expiryInterval}` (max 12 months). Scopes listed in the profile page. Tokens issued before 26.2 carry no scopes and are accepted until 27.0. |

## Endpoints used

| Feature | Endpoint | Notes |
|---|---|---|
| Profile, groups, children | `GET /api/user/{id}` | Own user only (or superuser). `groups[]` gives class/club memberships with `_links.homepage`; `students[]` for parents, `guardians[]` for students. |
| Timetable, due work, events | `GET /calendar/ajax/full?start=&end=&userId=&folderId=` | Unix seconds, ≤ 1 month recommended. FullCalendar-shaped items; `data.classAttendance` marks class events, `data.meta.completed` marks task-like (due work) events. |
| News feed | `GET /news/lists/feed?topic=` | `viewedAt` null = unread. |
| News topics | `GET /news/topics` | |
| Article | `GET /news/{id}` | Returns `{isSavedForLater, article{body,html,attachedFiles,...}}`. Opening marks as read. |
| Saved articles | `GET /news/saved`, `POST /news/saved/{id}/add`, `POST /news/saved/{id}/remove` | |
| Search | `GET /api/search?keyword=&filter={"types":[...]}&limit=` | Result `type` drives icons; `news` results open in-app, others deep-link to classic iLINQ. |
| Feedback / badges / learning moments | `GET /learning/evidenceFeed/user/{id}?cursor=` | Students see their own, parents their children's. Items discriminated by `discriminator`. |
| Assessments (staff) | `GET /api/assessment?filter=&limit=` | Superuser/staff only; wired in the client but unused by the student UI. |
| Token | `POST /user/token` | Creates a scoped JWT for the signed-in user. |

## Deep links into classic iLINQ

Anything the public API does not cover opens the original page in a new tab:
`/homepage/{folderId}` (class page), `/learning/assessments/{id}` (submit due
work), `/calendar/event/{id}`, `/news/{id}` (comments), `/notifications`,
`/messages`, `/eportfolio`, `/settings`, `/search/user/{id}`.

## Event classification (src/api/adapters.ts)

```
classAttendance present            -> class
className/meta mentions timetable  -> class
meta.completed boolean or dueWork  -> dueWork
"booking"/"resource"               -> booking
otherwise                          -> event
```

Covered by `src/test/adapters.test.ts`. Tune the regexes if Sheldon's event
type names differ (check `data.meta.type` on a few real events).
