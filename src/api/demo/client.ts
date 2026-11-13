import type { PortalApi } from '../schoolbox';
import type { AssessmentList, EvidenceFeedResponse, NewsArticleResponse, NewsFeedItem, NewsTopic, SearchFilter, SearchResultList, SessionInfo, User, UserToken } from '../types';
import { DEMO_ARTICLES, DEMO_EVIDENCE, DEMO_FOLDER_ITEMS, DEMO_NEWS, DEMO_PARENT, DEMO_SEARCH, DEMO_STUDENT, DEMO_TOPICS, buildCalendar } from './fixtures';
import { ApiError } from '../client';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** In-memory implementation of PortalApi backed by fixtures. */
export class DemoApi implements PortalApi {
  readonly kind = 'demo' as const;
  private saved = new Set<number>();
  private viewed = new Set<number>();
  constructor(readonly origin = 'https://ilinq.sheldoncollege.com', private latency = 180) {}

  absolute(path: string | null | undefined) {
    if (!path) return undefined;
    return /^https?:/i.test(path) ? path : this.origin + path;
  }
  proxied(path: string | null | undefined) {
    return this.absolute(path);
  }

  async login(username: string, _password: string): Promise<SessionInfo> {
    await wait(this.latency * 2);
    const u = username.toLowerCase();
    if (u === DEMO_PARENT.username) return { id: DEMO_PARENT.id, key: 'demo-key', role: 'parent', username: u };
    if (u === DEMO_STUDENT.username || u === 'demo' || u === 'student') return { id: DEMO_STUDENT.id, key: 'demo-key', role: 'student', username: u };
    throw new ApiError(401, 'Incorrect username or password');
  }
  async loginWithJwt(): Promise<SessionInfo> {
    await wait(this.latency);
    return { id: DEMO_STUDENT.id, key: 'demo-key', role: 'student', username: DEMO_STUDENT.username };
  }
  async logout() {}

  async getUser(id: number): Promise<User> {
    await wait(this.latency);
    if (id === DEMO_PARENT.id) return structuredClone(DEMO_PARENT);
    return structuredClone(DEMO_STUDENT);
  }
  async getCalendar(_userId: number, start: Date, end: Date) {
    await wait(this.latency);
    return buildCalendar(start, end);
  }
  async getNewsFeed(topic?: string): Promise<NewsFeedItem[]> {
    await wait(this.latency);
    return DEMO_NEWS.filter((n) => !topic || n.topics?.some((t) => t.slug === topic)).map((n) => ({
      ...n,
      viewedAt: this.viewed.has(n.id) ? new Date().toISOString() : n.viewedAt,
    }));
  }
  async getNewsTopics(): Promise<NewsTopic[]> {
    return DEMO_TOPICS;
  }
  async getNewsArticle(id: number): Promise<NewsArticleResponse> {
    await wait(this.latency);
    const a = DEMO_ARTICLES[id];
    if (!a) throw new ApiError(404, 'Article not found');
    this.viewed.add(id);
    return { ...a, isSavedForLater: this.saved.has(id) };
  }
  async getFolderNews(folderId: number): Promise<NewsFeedItem[]> {
    await wait(this.latency);
    return DEMO_NEWS.filter((n) => (folderId % 2 === 0 ? n.id % 2 === 0 : n.id % 2 === 1)).slice(0, 3);
  }
  async searchFolder(folderId: number, keyword: string, limit = 50): Promise<SearchResultList> {
    await wait(this.latency);
    const k = keyword.trim().toLowerCase();
    const data = DEMO_FOLDER_ITEMS(folderId).filter((r) => !k || r.title.toLowerCase().includes(k)).slice(0, limit);
    return { data, metadata: { count: data.length, cursor: { current: null, next: null } } };
  }
  async getSavedNews() {
    return [...this.saved];
  }
  async saveNews(id: number) {
    this.saved.add(id);
  }
  async unsaveNews(id: number) {
    this.saved.delete(id);
  }
  async search(keyword: string, filter?: SearchFilter, limit = 20): Promise<SearchResultList> {
    await wait(this.latency);
    const k = keyword.trim().toLowerCase();
    const data = DEMO_SEARCH.filter((r) => {
      const typeOk = !filter?.types?.length || filter.types.some((t) => r.type === t || r.type.startsWith(t + '.'));
      const text = `${r.title} ${r.meta ?? ''} ${r.description ?? ''}`.toLowerCase();
      return typeOk && (!k || text.includes(k));
    }).slice(0, limit);
    return { data, metadata: { count: data.length, cursor: { current: null, next: null } } };
  }
  async getEvidenceFeed(): Promise<EvidenceFeedResponse> {
    await wait(this.latency);
    return { data: DEMO_EVIDENCE, metadata: { count: DEMO_EVIDENCE.length, cursor: { current: null, next: null } } };
  }
  async getAssessments(): Promise<AssessmentList> {
    throw new ApiError(403, 'The assessment API is only available to staff and superusers.');
  }
  async createToken(name: string, scopes: string[]): Promise<UserToken> {
    await wait(this.latency);
    return { token: 'demo.jwt.token', name, scopes, jwtId: crypto.randomUUID(), type: 'api', createdAt: new Date().toISOString() };
  }
}
