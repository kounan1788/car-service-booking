# このファイルの説明(編集不可)
このスクラッチパッドファイルは、タスク管理および実装計画のためのものです。
取り組むタスクにおける作業計画をチェックボックス形式で記述します。

- [X] = 完了 (100% 完了、検証済み)
- [-] = 進行中 (積極的に作業中)
- [ ] = 計画 (未開始)
- [!] = ブロック (依存関係あり)
- [?] = レビューが必要 (検証が必要)

# 作業計画(編集可)

# 予約システム制限ロジックの修正タスク

## 1. 現状の問題点
1. 引取予約の制限が意図した動作をしていない
   - 現状：2件で他の予定が入らなくなっている
   - 期待：3件以上で予約不可となるべき
2. 管理者フォームの予約に制限が適用されている
3. イベントタイトルの引取表記が末尾にある

## 2. 修正要件（確定）
### 2.1 引取予約の制限ロジック修正
- 引取予約が3件以上の場合のみ新規予約をブロック
- 2件までは他の予約も受け付け可能に

### 2.2 管理者フォーム対応
- ✓ 管理者フォームからの予約は全ての制限を適用しない
- 制限チェック時にユーザータイプを最優先で判定

### 2.3 イベントタイトル生成の修正
- 新規予約のみ: `(引取) ${serviceType} - ${customerName}`
- ✓ 既存の予約は現状の形式のまま維持
- ✓ 既存の判定ロジックを維持（includes, startsWith, endsWith）

## 3. 修正計画（更新）
### 3.1 restrictions.tsの修正
```typescript
// すべての制限ルールの先頭に管理者チェックを追加
export const RESTRICTION_RULES: RestrictionRule[] = [
  {
    // ... 各ルールの condition 内で
    condition: (events, newEvent) => {
      // 管理者フォームからの予約は無条件で許可
      if (newEvent.userType === 'admin') return false;

      // 既存の制限ロジック
      // ...
    }
  }
];

// pickup_limitルールの修正
condition: (events, newEvent) => {
  // 管理者チェック
  if (newEvent.userType === 'admin') return false;

  const todayPickups = events.filter(event => {
    const eventDate = new Date(event.start);
    return (
      // 日付チェック
      eventDate.getFullYear() === selectedDate.getFullYear() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getDate() === selectedDate.getDate() &&
      // 既存の判定ロジックを維持
      (event.title?.includes('引取') || 
       event.title?.startsWith('引取') || 
       event.title?.endsWith('(引取)') ||
       event.title?.startsWith('(引取)')) // 新形式の判定を追加
    );
  });

  // 3件以上の場合のみブロック
  return todayPickups.length >= 3;
}
```

### 3.2 イベントタイトル生成の修正
- `app/api/calendar/route.ts`の修正
  ```typescript
  const title = newEvent.visitType === '引取' 
    ? `(引取) ${serviceType} - ${customerName}`
    : `${serviceType} - ${customerName}`;
  ```

## 4. テストケース（優先順位付け）
1. 管理者フォーム（最優先）
   - [!] 全ての制限が適用されないことを確認
   - [!] 引取予約が3件以上でも予約可能

2. 引取予約制限
   - [ ] 1件目：予約可能
   - [ ] 2件目：予約可能、他の予約も可能
   - [ ] 3件目：予約可能、他の予約も可能
   - [ ] 4件目：予約不可

3. イベントタイトル
   - [ ] 新規予約で新形式が適用されることを確認
   - [ ] 既存の予約の判定が正常に機能することを確認

## 5. 実装順序（確定）
1. restrictions.tsの修正
   - 管理者フォームの制限解除
   - 引取予約の制限ロジック修正
2. イベントタイトル生成の修正
3. テストケースの実行
4. 動作確認

確信度: 95%

理由：
1. 要件が明確に確定
   - 管理者フォームは全ての制限を無視
   - 既存の予約タイトルは変更不要
   - 既存の判定ロジックを維持

2. リスクが最小化
   - 既存の予約への影響なし
   - 既存の判定ロジックを維持しつつ新形式に対応

3. テストケースが具体化
   - 優先順位付けにより重要な確認項目を明確化
   - 各機能の検証手順が明確

## 不明点・確認事項
1. 既存の引取予約のタイトル形式は統一されているか？
2. 管理者フォームの予約に他の制限（車検・12ヵ月点検など）も適用しないのか？
3. イベントタイトルの変更は既存の予約に遡って適用する必要があるか？

これらの点について確認が必要です。
