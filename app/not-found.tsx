import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">ページが見つかりません</h2>
      <p className="text-gray-600 mb-4">お探しのページは存在しないか、移動した可能性があります。</p>
      <Button
        asChild
        className="bg-blue-500 hover:bg-blue-600"
      >
        <Link href="/">
          トップページに戻る
        </Link>
      </Button>
    </div>
  );
} 