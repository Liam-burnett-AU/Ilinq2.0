import { SchoolboxClient } from './client';
import type {
  AssessmentList,
  CalendarAjaxEvent,
  EvidenceFeedResponse,
  NewsArticleResponse,
  NewsFeedItem,
  NewsTopic,
  SearchFilter,
  SearchResultList,
  SessionInfo,
  User,
  UserToken,
} from './types';

/**
 * The portal's data interface. `LiveApi` talks to a real Schoolbox instance;
 * `DemoApi` (src/api/demo) serves fixtures in the same shapes so the UI can
 * be developed and demoed without credentials.
 */
export interface PortalApi {
  readonly kind: 'live' | 'demo';
  /** Absolute URL for a Schoolbox-relative link (e.g. "/homepage/83"). */
  absolute(path: string | null | undefined): string | undefined;

  login(username: string, password: string): Promise<SessionInfo>;
  loginWithJwt(jwt: string): Promise<SessionInfo>;
  logout(): Promise<void>;

  getUser(id: number): Promise<User>;
  getCalendar(userId: number, start: Date, end: Date, folderId?: number): Promise<CalendarAjaxEvent[]>;
  getNewsFeed(topic?: string): Promise<NewsFeedItem[]>;
  getNewsTopics(): Promise<NewsTopic[]>;
  getNewsArticle(id: number): Promise<NewsArticleResponse>;
  getSavedNews(): Promise<number[]>;
  saveNews(id: number): Promise<void>;
  unsaveNews(id: number): Promise<void>;
  search(keyword: string, filter?: SearchFilter, limit?: number): Promise<SearchResultList>;
  getEvidenceFeed(userId: number, cursor?: string | null): Promise<EvidenceFeedResponse>;
  /** Staff / superuser only on Schoolbox. */
  getAssessments(filter: Record<string, unknown>, limit?: number): Promise<AssessmentList>;
  createToken(name: string, scopes: string[], expiryMonths?: number): Promise<UserToken>;
}

export const toUnix = (d: Date) => Math.floor(d.getTime() / 1000);

export class LiveApi implements PortalApi {
  readonly kind = 'live' as const;
  constructor(
    readonly client: SchoolboxClient,
    /** Public origin of the Schoolbox instance, used to build absolute links. */
    readonly origin: string,
  ) {}

  absolute(path: string | null | undefined) {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    return this.origin.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
  }

  /** Path on the proxy for a Schoolbox-relative asset (keeps cookies working). */
  proxied(path: string | null | undefined) {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) {
      if (path.startsWith(this.origin)) return this.client.baseUrl + path.slice(this.origin.length);
      return path;
    }
    return this.client.baseUrl + (path.startsWith('/') ? path : `/${path}`);
  }

  login(username: string, password: string) {
    return this.client.post<SessionInfo>('/api/session', { form: { username, password } });
  }
  loginWithJwt(jwt: string) {
    return this.client.post<SessionInfo>('/api/session', { form: { jwt } });
  }
  async logout() {
    // Schoolbox's logout is a normal page route; failures are not fatal.
    try {
      await this.client.request('/logout', { method: 'GET' });
    } catch {
      /* ignore */
    }
  }

  getUser(id: number) {
    return this.client.get<User>(`/api/user/${id}`);
  }
  getCalendar(userId: number, start: Date, end: Date, folderId?: number) {
    return this.client.get<CalendarAjaxEvent[]>('/calendar/ajax/full', {
      start: toUnix(start),
      end: toUnix(end),
      userId,
      folderId,
    });
  }
  getNewsFeed(topic?: string) {
    return this.client.get<NewsFeedItem[]>('/news/lists/feed', topic ? { topic } : undefined);
  }
  getNewsTopics() {
    return this.client.get<NewsTopic[]>('/news/topics');
  }
  getNewsArticle(id: number) {
    return this.client.get<NewsArticleResponse>(`/news/${id}`);
  }
  getSavedNews() {
    return this.client.get<number[]>('/news/saved');
  }
  async saveNews(id: number) {
    await this.client.post(`/news/saved/${id}/add`);
  }
  async unsaveNews(id: number) {
    await this.client.post(`/news/saved/${id}/remove`);
  }
  search(keyword: string, filter?: SearchFilter, limit = 20) {
    return this.client.get<SearchResultList>('/api/search', {
      keyword,
      filter: filter ? JSON.stringify(filter) : undefined,
      limit,
    });
  }
  getEvidenceFeed(userId: number, cursor?: string | null) {
    return this.client.get<EvidenceFeedResponse>(`/learning/evidenceFeed/user/${userId}`, { cursor: cursor ?? undefined });
  }
  getAssessments(filter: Record<string, unknown>, limit = 100) {
    return this.client.get<AssessmentList>('/api/assessment', { filter: JSON.stringify(filter), limit });
  }
  createToken(name: string, scopes: string[], expiryMonths = 6) {
    return this.client.post<UserToken>('/user/token', { json: { name, scopes, expiryInterval: expiryMonths } });
  }
}
