'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "../components/ui/input";

interface ServiceLimit {
  service: string;
  limit: number | null;
}

export default function SettingsPage() {
  const [limits, setLimits] = useState<ServiceLimit[]>([
    { service: '車検', limit: 2 },
    { service: '12ヵ月点検', limit: 2 },
    { service: '6ヵ月点検(貨物車)', limit: 2 },
    { service: 'スケジュール点検', limit: null },
    { service: 'オイル交換', limit: null },
    { service: 'タイヤ交換', limit: null },
    { service: '一般整備', limit: null },
    { service: '引取', limit: null }
  ]);

  // ローカルストレージから設定を読み込む
  useEffect(() => {
    const savedLimits = localStorage.getItem('serviceLimits');
    if (savedLimits) {
      setLimits(JSON.parse(savedLimits));
    }
  }, []);

  const handleLimitChange = (service: string, value: string) => {
    const newValue = value === '制限なし' ? null : parseInt(value);
    const newLimits = limits.map(item => 
      item.service === service ? { ...item, limit: newValue } : item
    );
    
    // オブジェクト形式で保存
    const limitsObject = newLimits.reduce((acc, curr) => ({
      ...acc,
      [curr.service]: curr.limit
    }), {});
    
    setLimits(newLimits);
    localStorage.setItem('serviceLimits', JSON.stringify(limitsObject));
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">予約制限設定</h1>
      <div className="space-y-4">
        {limits.map((item) => (
          <div key={item.service} className="flex items-center justify-between">
            <label className="font-medium">{item.service}</label>
            <select
              className="ml-4 p-2 border rounded"
              value={item.limit === null ? '制限なし' : item.limit}
              onChange={(e) => handleLimitChange(item.service, e.target.value)}
            >
              <option value="制限なし">制限なし</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Button 
        className="mt-6"
        onClick={() => window.location.href = '/'}
      >
        トップページに戻る
      </Button>
    </div>
  );
} 