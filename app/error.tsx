'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h2>
      <p className="text-gray-600 mb-4">申し訳ありませんが、問題が発生しました。</p>
      <div className="flex gap-4">
        <Button
          onClick={reset}
          className="bg-blue-500 hover:bg-blue-600"
        >
          もう一度試す
        </Button>
        <Button
          onClick={() => window.location.href = '/'}
          className="bg-gray-500 hover:bg-gray-600"
        >
          トップページに戻る
        </Button>
      </div>
    </div>
  );
} 