import type { Lang, RewriteSnippet, RefactorSnippet } from './types'

// ---------------------------------------------------------------------------
// Réécriture : on tape le snippet entier, de zéro.
// ---------------------------------------------------------------------------

export const REWRITE: RewriteSnippet[] = [
  // ----- TypeScript -----
  {
    id: 'ts-debounce',
    lang: 'ts',
    title: 'debounce',
    code: `function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: T) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}`,
  },
  {
    id: 'ts-groupby',
    lang: 'ts',
    title: 'group_by',
    code: `function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    out[k] ??= []
    out[k].push(item)
  }
  return out
}`,
  },
  {
    id: 'ts-fetch',
    lang: 'ts',
    title: 'fetch_json',
    code: `async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(\`HTTP \${res.status}: \${res.statusText}\`)
  }
  return res.json() as Promise<T>
}`,
  },
  {
    id: 'ts-emitter',
    lang: 'ts',
    title: 'event_emitter',
    code: `class Emitter<E> {
  private listeners = new Set<(event: E) => void>()

  on(fn: (event: E) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit(event: E) {
    for (const fn of this.listeners) fn(event)
  }
}`,
  },
  {
    id: 'ts-bsearch',
    lang: 'ts',
    title: 'binary_search',
    code: `function binarySearch(arr: number[], target: number): number {
  let lo = 0
  let hi = arr.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid] === target) return mid
    if (arr[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}`,
  },

  // ----- Python -----
  {
    id: 'py-memo',
    lang: 'py',
    title: 'fib_memo',
    code: `from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


print([fib(i) for i in range(10)])`,
  },
  {
    id: 'py-dataclass',
    lang: 'py',
    title: 'dataclass',
    code: `from dataclasses import dataclass, field


@dataclass
class Playlist:
    name: str
    tracks: list[str] = field(default_factory=list)

    def add(self, track: str) -> None:
        self.tracks.append(track)

    @property
    def size(self) -> int:
        return len(self.tracks)`,
  },
  {
    id: 'py-counter',
    lang: 'py',
    title: 'word_count',
    code: `from collections import Counter


def top_words(text: str, n: int = 5) -> list[tuple[str, int]]:
    words = text.lower().split()
    counts = Counter(w.strip('.,!?') for w in words)
    return counts.most_common(n)`,
  },
  {
    id: 'py-context',
    lang: 'py',
    title: 'context_manager',
    code: `import time
from contextlib import contextmanager


@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.3f}s")`,
  },
  {
    id: 'py-pipeline',
    lang: 'py',
    title: 'pipeline',
    code: `def pipeline(rows: list[dict]) -> list[str]:
    active = [r for r in rows if r.get("active")]
    names = sorted(r["name"].title() for r in active)
    return [f"{i}. {name}" for i, name in enumerate(names, 1)]`,
  },

  // ----- Rust -----
  {
    id: 'rs-struct',
    lang: 'rs',
    title: 'struct_impl',
    code: `#[derive(Debug, Clone)]
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    fn dist(&self, other: &Point) -> f64 {
        ((self.x - other.x).powi(2) + (self.y - other.y).powi(2)).sqrt()
    }
}`,
  },
  {
    id: 'rs-match',
    lang: 'rs',
    title: 'match_enum',
    code: `enum Shape {
    Circle(f64),
    Rect(f64, f64),
    Triangle { base: f64, height: f64 },
}

fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle(r) => std::f64::consts::PI * r * r,
        Shape::Rect(w, h) => w * h,
        Shape::Triangle { base, height } => 0.5 * base * height,
    }
}`,
  },
  {
    id: 'rs-iter',
    lang: 'rs',
    title: 'iterators',
    code: `fn stats(values: &[i32]) -> (i32, f64) {
    let sum: i32 = values.iter().sum();
    let evens = values
        .iter()
        .filter(|v| *v % 2 == 0)
        .count();
    let mean = sum as f64 / values.len() as f64;
    (evens as i32, mean)
}`,
  },
  {
    id: 'rs-result',
    lang: 'rs',
    title: 'result',
    code: `use std::num::ParseIntError;

fn parse_pair(input: &str) -> Result<(i64, i64), ParseIntError> {
    let mut parts = input.splitn(2, ',');
    let a = parts.next().unwrap_or("").trim().parse()?;
    let b = parts.next().unwrap_or("").trim().parse()?;
    Ok((a, b))
}`,
  },
  {
    id: 'rs-dedup',
    lang: 'rs',
    title: 'dedup_sort',
    code: `fn unique_sorted(mut values: Vec<String>) -> Vec<String> {
    values.sort();
    values.dedup();
    values
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect()
}`,
  },

  // ----- Go -----
  {
    id: 'go-errors',
    lang: 'go',
    title: 'error_wrap',
    code: `func loadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config: %w", err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }
    return &cfg, nil
}`,
  },
  {
    id: 'go-method',
    lang: 'go',
    title: 'struct_method',
    code: `type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}`,
  },
  {
    id: 'go-waitgroup',
    lang: 'go',
    title: 'waitgroup',
    code: `func fetchAll(urls []string) []string {
    var wg sync.WaitGroup
    results := make([]string, len(urls))
    for i, url := range urls {
        wg.Add(1)
        go func() {
            defer wg.Done()
            results[i] = fetch(url)
        }()
    }
    wg.Wait()
    return results
}`,
  },
  {
    id: 'go-handler',
    lang: 'go',
    title: 'http_handler',
    code: `func handleUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    user, err := store.Get(r.Context(), id)
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}`,
  },
  {
    id: 'go-count',
    lang: 'go',
    title: 'map_count',
    code: `func countTags(posts []Post) map[string]int {
    counts := make(map[string]int)
    for _, post := range posts {
        for _, tag := range post.Tags {
            counts[strings.ToLower(tag)]++
        }
    }
    return counts
}`,
  },
  {
    id: 'ts-pipe',
    lang: 'ts',
    title: 'pipe',
    code: `function pipe<T>(...fns: Array<(x: T) => T>) {
  return (input: T) => fns.reduce((acc, fn) => fn(acc), input)
}`,
  },
  {
    id: 'ts-retry',
    lang: 'ts',
    title: 'retry',
    code: `async function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  let last: unknown
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
    }
  }
  throw last
}`,
  },
  {
    id: 'py-chunked',
    lang: 'py',
    title: 'chunked',
    code: `def chunked(items, size):
    for i in range(0, len(items), size):
        yield items[i : i + size]`,
  },
  {
    id: 'py-flatten',
    lang: 'py',
    title: 'flatten',
    code: `def flatten(nested):
    return [x for row in nested for x in row]`,
  },
  {
    id: 'rs-window',
    lang: 'rs',
    title: 'moving_average',
    code: `fn moving_average(xs: &[f64], k: usize) -> Vec<f64> {
    xs.windows(k).map(|w| w.iter().sum::<f64>() / k as f64).collect()
}`,
  },
  {
    id: 'rs-wordcount',
    lang: 'rs',
    title: 'word_count',
    code: `fn word_count(text: &str) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
}`,
  },
  {
    id: 'go-unique',
    lang: 'go',
    title: 'unique',
    code: `func unique(items []string) []string {
    seen := make(map[string]struct{})
    out := []string{}
    for _, item := range items {
        if _, ok := seen[item]; ok {
            continue
        }
        seen[item] = struct{}{}
        out = append(out, item)
    }
    return out
}`,
  },
  {
    id: 'go-maxby',
    lang: 'go',
    title: 'max_by',
    code: `func maxBy[T any](items []T, key func(T) int) T {
    best := items[0]
    for _, item := range items[1:] {
        if key(item) > key(best) {
            best = item
        }
    }
    return best
}`,
  },
]

// ---------------------------------------------------------------------------
// Modification : on part de `before` et on doit atteindre `after`.
// Pensé pour entraîner les manipulations (et les motions vim).
// ---------------------------------------------------------------------------

export const REFACTOR: RefactorSnippet[] = [
  // ----- TypeScript -----
  {
    id: 'ts-arrow',
    lang: 'ts',
    title: 'arrow_function',
    hint: 'convertis en fonctions fléchées avec return implicite',
    before: `function double(n: number): number {
  return n * 2
}

function isEven(n: number): boolean {
  return n % 2 === 0
}

const result = [1, 2, 3].map(function (n) {
  return double(n)
})`,
    after: `const double = (n: number): number => n * 2

const isEven = (n: number): boolean => n % 2 === 0

const result = [1, 2, 3].map((n) => double(n))`,
  },
  {
    id: 'ts-async',
    lang: 'ts',
    title: 'async_await',
    hint: 'remplace la chaîne .then() par async/await',
    before: `function loadUser(id: string) {
  return fetch('/api/users/' + id)
    .then((res) => res.json())
    .then((user) => {
      console.log(user.name)
      return user
    })
}`,
    after: `async function loadUser(id: string) {
  const res = await fetch('/api/users/' + id)
  const user = await res.json()
  console.log(user.name)
  return user
}`,
  },
  {
    id: 'ts-filtermap',
    lang: 'ts',
    title: 'filter_map',
    hint: 'remplace la boucle for par filter + map',
    before: `function activeNames(users: User[]): string[] {
  const names: string[] = []
  for (let i = 0; i < users.length; i++) {
    if (users[i].active) {
      names.push(users[i].name.toUpperCase())
    }
  }
  return names
}`,
    after: `function activeNames(users: User[]): string[] {
  return users
    .filter((user) => user.active)
    .map((user) => user.name.toUpperCase())
}`,
  },
  {
    id: 'ts-guard',
    lang: 'ts',
    title: 'guard_clauses',
    hint: 'aplatis le if imbriqué avec des early returns',
    before: `function checkout(cart: Cart): string {
  if (cart.items.length > 0) {
    if (cart.user) {
      if (cart.user.verified) {
        return 'ok'
      } else {
        return 'unverified'
      }
    } else {
      return 'anonymous'
    }
  } else {
    return 'empty'
  }
}`,
    after: `function checkout(cart: Cart): string {
  if (cart.items.length === 0) return 'empty'
  if (!cart.user) return 'anonymous'
  if (!cart.user.verified) return 'unverified'
  return 'ok'
}`,
  },

  // ----- Python -----
  {
    id: 'py-comprehension',
    lang: 'py',
    title: 'comprehension',
    hint: 'remplace les boucles par des comprehensions',
    before: `def squares_of_evens(numbers):
    result = []
    for n in numbers:
        if n % 2 == 0:
            result.append(n * n)
    return result


def labels(items):
    out = {}
    for item in items:
        out[item.id] = item.name
    return out`,
    after: `def squares_of_evens(numbers):
    return [n * n for n in numbers if n % 2 == 0]


def labels(items):
    return {item.id: item.name for item in items}`,
  },
  {
    id: 'py-fstring',
    lang: 'py',
    title: 'f_strings',
    hint: 'remplace les concaténations et .format() par des f-strings',
    before: `def greet(user, count):
    msg = "Bonjour " + user.name + " !"
    detail = "Tu as {} messages".format(count)
    pct = "Progression: {:.1f}%".format(user.progress * 100)
    return msg + " " + detail + ". " + pct`,
    after: `def greet(user, count):
    msg = f"Bonjour {user.name} !"
    detail = f"Tu as {count} messages"
    pct = f"Progression: {user.progress * 100:.1f}%"
    return f"{msg} {detail}. {pct}"`,
  },
  {
    id: 'py-get',
    lang: 'py',
    title: 'dict_get',
    hint: 'simplifie avec dict.get() et ses valeurs par défaut',
    before: `def parse_options(opts):
    if "host" in opts:
        host = opts["host"]
    else:
        host = "localhost"
    if "port" in opts:
        port = opts["port"]
    else:
        port = 8080
    return host, port`,
    after: `def parse_options(opts):
    host = opts.get("host", "localhost")
    port = opts.get("port", 8080)
    return host, port`,
  },
  {
    id: 'py-dataclass-refactor',
    lang: 'py',
    title: 'to_dataclass',
    hint: 'convertis la classe en dataclass',
    before: `class Task:
    def __init__(self, title, done=False, priority=0):
        self.title = title
        self.done = done
        self.priority = priority

    def __repr__(self):
        return f"Task({self.title!r}, {self.done}, {self.priority})"`,
    after: `from dataclasses import dataclass


@dataclass
class Task:
    title: str
    done: bool = False
    priority: int = 0`,
  },

  // ----- Rust -----
  {
    id: 'rs-question',
    lang: 'rs',
    title: 'question_mark',
    hint: 'remplace les unwrap/match par l’opérateur ?',
    before: `fn read_port(input: &str) -> Result<u16, ParseIntError> {
    let trimmed = input.trim();
    let port = match trimmed.parse::<u16>() {
        Ok(p) => p,
        Err(e) => return Err(e),
    };
    Ok(port + 1)
}`,
    after: `fn read_port(input: &str) -> Result<u16, ParseIntError> {
    let port = input.trim().parse::<u16>()?;
    Ok(port + 1)
}`,
  },
  {
    id: 'rs-iterchain',
    lang: 'rs',
    title: 'iterator_chain',
    hint: 'remplace la boucle par une chaîne d’itérateurs',
    before: `fn long_names(names: &[String]) -> Vec<String> {
    let mut out = Vec::new();
    for name in names {
        if name.len() > 3 {
            out.push(name.to_uppercase());
        }
    }
    out
}`,
    after: `fn long_names(names: &[String]) -> Vec<String> {
    names
        .iter()
        .filter(|name| name.len() > 3)
        .map(|name| name.to_uppercase())
        .collect()
}`,
  },
  {
    id: 'rs-iflet',
    lang: 'rs',
    title: 'if_let',
    hint: 'remplace les match à un seul bras utile par if let',
    before: `fn describe(value: Option<i32>) {
    match value {
        Some(v) => println!("valeur: {v}"),
        None => {}
    }
    match value {
        Some(v) if v > 10 => println!("grand: {v}"),
        _ => {}
    }
}`,
    after: `fn describe(value: Option<i32>) {
    if let Some(v) = value {
        println!("valeur: {v}");
    }
    if let Some(v) = value {
        if v > 10 {
            println!("grand: {v}");
        }
    }
}`,
  },
  {
    id: 'rs-borrow',
    lang: 'rs',
    title: 'borrow_str',
    hint: 'prends des &str en paramètre au lieu de String',
    before: `fn full_name(first: String, last: String) -> String {
    format!("{} {}", first, last)
}

fn shout(message: String) -> String {
    message.to_uppercase()
}`,
    after: `fn full_name(first: &str, last: &str) -> String {
    format!("{} {}", first, last)
}

fn shout(message: &str) -> String {
    message.to_uppercase()
}`,
  },

  // ----- Go -----
  {
    id: 'go-early',
    lang: 'go',
    title: 'early_return',
    hint: 'inverse les conditions pour des early returns',
    before: `func process(order *Order) error {
    if order != nil {
        if len(order.Items) > 0 {
            if order.Paid {
                ship(order)
                return nil
            }
            return errors.New("not paid")
        }
        return errors.New("empty order")
    }
    return errors.New("nil order")
}`,
    after: `func process(order *Order) error {
    if order == nil {
        return errors.New("nil order")
    }
    if len(order.Items) == 0 {
        return errors.New("empty order")
    }
    if !order.Paid {
        return errors.New("not paid")
    }
    ship(order)
    return nil
}`,
  },
  {
    id: 'go-iferr',
    lang: 'go',
    title: 'if_err_inline',
    hint: 'utilise la forme if err := ...; err != nil',
    before: `func save(user User) error {
    err := validate(user)
    if err != nil {
        return err
    }
    err = db.Insert(user)
    if err != nil {
        return err
    }
    return nil
}`,
    after: `func save(user User) error {
    if err := validate(user); err != nil {
        return err
    }
    if err := db.Insert(user); err != nil {
        return err
    }
    return nil
}`,
  },
  {
    id: 'go-range',
    lang: 'go',
    title: 'range_loop',
    hint: 'remplace les boucles indexées par range',
    before: `func sum(values []int) int {
    total := 0
    for i := 0; i < len(values); i++ {
        total += values[i]
    }
    return total
}

func hasZero(values []int) bool {
    for i := 0; i < len(values); i++ {
        if values[i] == 0 {
            return true
        }
    }
    return false
}`,
    after: `func sum(values []int) int {
    total := 0
    for _, v := range values {
        total += v
    }
    return total
}

func hasZero(values []int) bool {
    for _, v := range values {
        if v == 0 {
            return true
        }
    }
    return false
}`,
  },
  {
    id: 'go-wrap',
    lang: 'go',
    title: 'wrap_errors',
    hint: 'enveloppe les erreurs avec fmt.Errorf et %w',
    before: `func loadAvatar(id string) ([]byte, error) {
    path, err := resolve(id)
    if err != nil {
        return nil, err
    }
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }
    return data, nil
}`,
    after: `func loadAvatar(id string) ([]byte, error) {
    path, err := resolve(id)
    if err != nil {
        return nil, fmt.Errorf("resolve %s: %w", id, err)
    }
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read %s: %w", path, err)
    }
    return data, nil
}`,
  },
]

// ---------------------------------------------------------------------------
// Sprint : courts snippets one/two-liners enchaînés en time-attack.
// ---------------------------------------------------------------------------

export const SPRINT: RewriteSnippet[] = [
  { id: 'sp-ts-1', lang: 'ts', title: 'map', code: `const ids = users.map((u) => u.id)` },
  { id: 'sp-ts-2', lang: 'ts', title: 'filter', code: `const live = items.filter((i) => i.active)` },
  { id: 'sp-ts-3', lang: 'ts', title: 'reduce', code: `const total = nums.reduce((a, b) => a + b, 0)` },
  { id: 'sp-ts-4', lang: 'ts', title: 'guard', code: `if (!user) throw new Error('not found')` },
  { id: 'sp-ts-5', lang: 'ts', title: 'await', code: `const res = await fetch(\`/api/\${id}\`)` },
  { id: 'sp-ts-6', lang: 'ts', title: 'ternary', code: `const label = count > 0 ? 'on' : 'off'` },
  { id: 'sp-py-1', lang: 'py', title: 'comp', code: `squares = [n * n for n in range(10)]` },
  { id: 'sp-py-2', lang: 'py', title: 'dict', code: `by_id = {u.id: u for u in users}` },
  { id: 'sp-py-3', lang: 'py', title: 'guard', code: `if not user:\n    raise ValueError("not found")` },
  { id: 'sp-py-4', lang: 'py', title: 'enumerate', code: `for i, item in enumerate(items):\n    print(i, item)` },
  { id: 'sp-py-5', lang: 'py', title: 'with', code: `with open(path) as f:\n    data = f.read()` },
  { id: 'sp-rs-1', lang: 'rs', title: 'iter', code: `let sum: i32 = nums.iter().sum();` },
  { id: 'sp-rs-2', lang: 'rs', title: 'map', code: `let ids: Vec<_> = users.iter().map(|u| u.id).collect();` },
  { id: 'sp-rs-3', lang: 'rs', title: 'match', code: `match res {\n    Ok(v) => v,\n    Err(e) => return Err(e),\n}` },
  { id: 'sp-rs-4', lang: 'rs', title: 'let', code: `let Some(user) = find(id) else { return };` },
  { id: 'sp-go-1', lang: 'go', title: 'iferr', code: `if err != nil {\n    return err\n}` },
  { id: 'sp-go-2', lang: 'go', title: 'range', code: `for i, v := range items {\n    fmt.Println(i, v)\n}` },
  { id: 'sp-go-3', lang: 'go', title: 'make', code: `cache := make(map[string]int)` },
  { id: 'sp-go-4', lang: 'go', title: 'append', code: `out = append(out, item)` },
]

/** Tire un snippet court de sprint pour une langue, en évitant le précédent. */
export function pickSprint(lang: Lang, excludeId?: string) {
  const pool = SPRINT.filter((s) => s.lang === lang && s.id !== excludeId)
  const all = pool.length ? pool : SPRINT.filter((s) => s.lang === lang)
  const fallback = all.length ? all : SPRINT
  const s = fallback[Math.floor(Math.random() * fallback.length)]
  return { id: s.id, title: s.title, start: '', target: s.code }
}

/**
 * Drill adaptatif : choisit l'exercice de réécriture le plus riche en TES
 * caractères faibles (weakKeys), parmi le top 3, pour cibler ton entraînement.
 * Sans données de faiblesse, se comporte comme un tirage aléatoire.
 */
export function pickDrill(
  lang: Lang,
  weak: Record<string, number>,
  excludeId?: string,
) {
  const pool = REWRITE.filter((s) => s.lang === lang && s.id !== excludeId)
  const base = pool.length ? pool : REWRITE.filter((s) => s.lang === lang)
  if (!base.length) return pickChallenge('rewrite', lang, excludeId)

  const score = (code: string) => {
    let s = 0
    for (const ch of code) s += weak[ch] ?? 0
    return s
  }
  const ranked = base
    .map((s) => ({ s, sc: score(s.code) }))
    .sort((a, b) => b.sc - a.sc)
  const top = ranked.slice(0, 3)
  const chosen = top[Math.floor(Math.random() * top.length)].s
  return { id: chosen.id, title: chosen.title, start: '', target: chosen.code }
}

/** Jour local au format YYYY-MM-DD (sert de graine au défi du jour). */
export function dailyKey(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

/**
 * Défi du jour : même snippet pour tout le monde un jour donné, choisi de façon
 * déterministe à partir de la date (hash simple). Renvoie aussi sa langue pour
 * que l'app s'y aligne.
 */
export function pickDaily(): { lang: Lang; challenge: ReturnType<typeof pickChallenge> } {
  const key = dailyKey()
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const idx = Math.abs(h) % REWRITE.length
  const s = REWRITE[idx]
  return {
    lang: s.lang,
    challenge: { id: s.id, title: s.title, start: '', target: s.code },
  }
}

export function pickChallenge(
  game: 'rewrite' | 'refactor',
  lang: Lang,
  excludeId?: string,
) {
  if (game === 'rewrite') {
    const pool = REWRITE.filter((s) => s.lang === lang && s.id !== excludeId)
    const all = pool.length ? pool : REWRITE.filter((s) => s.lang === lang)
    const s = all[Math.floor(Math.random() * all.length)]
    return { id: s.id, title: s.title, start: '', target: s.code }
  }
  const pool = REFACTOR.filter((s) => s.lang === lang && s.id !== excludeId)
  const all = pool.length ? pool : REFACTOR.filter((s) => s.lang === lang)
  const s = all[Math.floor(Math.random() * all.length)]
  return { id: s.id, title: s.title, hint: s.hint, start: s.before, target: s.after }
}
