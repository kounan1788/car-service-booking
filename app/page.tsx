"use client";

import { useState, useEffect } from "react";
import { format, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDate } from "date-fns";
import { ja } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SERVICE_CONFIG, type ServiceType } from '@/app/config/services';

interface Reservation {
  fullName: string;
  phone: string;
  postalCode: string;
  address: string;
  carModel: string;
  yearEra: "令和" | "平成";
  yearNumber: string;
  registrationNumber: string;
  companyName: string;
  notes: string;
  service: string;
  selectedDate: Date | null;
  selectedTime: string;
}

interface ParsedReservation extends Omit<Reservation, 'selectedDate'> {
  selectedDate: string | null;
}

interface ParsedEvent {
  start: string;
  end: string;
  title?: string;
  duration?: string;
}

const addToGoogleCalendar = (reservation: Reservation) => {
  if (!reservation.selectedDate) return '';
  
  const date = format(reservation.selectedDate, "yyyyMMdd");
  const [hour, minute] = reservation.selectedTime.split(':');
  const startTime = `${date}T${hour.padStart(2, '0')}${minute}00`;
  
  // サービスごとの作業時間を取得
  const config = SERVICE_CONFIG[reservation.service as ServiceType];
  const duration = config?.duration || 60; // デフォルトは60分
  
  // 終了時刻を計算
  const endDate = new Date(reservation.selectedDate);
  endDate.setHours(parseInt(hour), parseInt(minute) + duration, 0);
  const endTime = format(endDate, "yyyyMMdd'T'HHmmss");
  
  const text = `${reservation.service} - ${reservation.companyName || reservation.fullName}`;
  const details = `
    【お客様情報】
    ${reservation.companyName ? `会社名: ${reservation.companyName}` : `お名前: ${reservation.fullName}`}
    ${reservation.phone ? `電話番号: ${reservation.phone}` : ''}
    ${reservation.address ? `住所: ${reservation.address}` : ''}
    ${reservation.carModel ? `車種: ${reservation.carModel}` : ''}
    ${reservation.yearNumber ? `年式: ${reservation.yearEra}${reservation.yearNumber}年` : ''}
    ${reservation.registrationNumber ? `登録番号: ${reservation.registrationNumber}` : ''}
    
    【予約内容】
    サービス: ${reservation.service}
    作業時間: ${duration}分
    ${reservation.notes ? `備考: ${reservation.notes}` : ''}
  `.trim();

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}`;
};

// 祝日のリストを更新（2024年と2025年）
const HOLIDAYS = [
  // 2024年の祝日
  "2024-01-01", // 元日
  "2024-01-08", // 成人の日
  "2024-02-11", // 建国記念の日
  "2024-02-12", // 振替休日
  "2024-02-23", // 天皇誕生日
  "2024-03-20", // 春分の日
  "2024-04-29", // 昭和の日
  "2024-05-03", // 憲法記念日
  "2024-05-04", // みどりの日
  "2024-05-05", // こどもの日
  "2024-05-06", // 振替休日
  "2024-07-15", // 海の日
  "2024-08-11", // 山の日
  "2024-08-12", // 振替休日
  "2024-09-16", // 敬老の日
  "2024-09-22", // 秋分の日
  "2024-09-23", // 振替休日
  "2024-10-14", // スポーツの日
  "2024-11-03", // 文化の日
  "2024-11-04", // 振替休日
  "2024-11-23", // 勤労感謝の日

  // 2025年の祝日
  "2025-01-01", // 元日
  "2025-01-13", // 成人の日
  "2025-02-11", // 建国記念の日
  "2025-02-23", // 天皇誕生日
  "2025-02-24", // 振替休日
  "2025-03-20", // 春分の日
  "2025-04-29", // 昭和の日
  "2025-05-03", // 憲法記念日
  "2025-05-04", // みどりの日
  "2025-05-05", // こどもの日
  "2025-05-06", // 振替休日
  "2025-07-21", // 海の日
  "2025-08-11", // 山の日
  "2025-09-15", // 敬老の日
  "2025-09-23", // 秋分の日
  "2025-10-13", // スポーツの日
  "2025-11-03", // 文化の日
  "2025-11-23", // 勤労感謝の日
  "2025-11-24", // 振替休日
];

// 定休日判定関数を修正
const isClosedDay = (date: Date) => {
  // 日曜日
  if (getDay(date) === 0) return true;

  // 祝日（振替休日を含む）
  const dateStr = format(date, "yyyy-MM-dd");
  if (HOLIDAYS.includes(dateStr)) return true;

  // 第2・第4土曜日
  if (getDay(date) === 6) {
    const weekOfMonth = Math.ceil(getDate(date) / 7);
    if (weekOfMonth === 2 || weekOfMonth === 4) return true;
  }

  return false;
};

const generateCalendarGrid = (date: Date): (Date | null)[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start, end });
  const startDay = getDay(start);
  const totalDays = startDay + daysInMonth.length;
  const totalCells = Math.ceil(totalDays / 7) * 7;

  return [
    ...Array(startDay).fill(null),
    ...daysInMonth,
    ...Array(totalCells - totalDays).fill(null)
  ];
};

interface ApiError {
  message: string;
}

const handleError = (error: unknown) => {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    alert(error.message);
  } else {
    console.error('Unknown error:', error);
    alert('予約の登録中にエラーが発生しました');
  }
};

export default function BookingFlow() {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [customerType, setCustomerType] = useState<"new" | "existing" | "lease" | null>(null);
  const [formData, setFormData] = useState<Reservation>({
    fullName: "",
    phone: "",
    postalCode: "",
    address: "",
    carModel: "",
    yearEra: "令和",
    yearNumber: "",
    registrationNumber: "",
    companyName: "",
    notes: "",
    service: "",
    selectedDate: null,
    selectedTime: "",
  });

  const [confirmedReservations, setConfirmedReservations] = useState<Reservation[]>([]);
  const [existingEvents, setExistingEvents] = useState<ParsedEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const generateTimeSlots = (day: Date) => {
    const slots: string[] = [];
    const isSaturday = day.getDay() === 6;
    const start = 9;
    const end = isSaturday ? 16.5 : 17.5;
    
    for (let time = start; time <= end; time += 0.5) {
      const hour = Math.floor(time);
      const minute = time % 1 === 0 ? "00" : "30";
      if (hour === 12) continue;
      slots.push(`${hour}:${minute}`);
    }
    return slots;
  };

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const handleConfirmReservation = async () => {
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.message || '予約の追加に失敗しました');
      }

      setConfirmedReservations(prev => [...prev, formData]);
      setStep(6);
    } catch (error) {
      handleError(error);
    }
  };

  useEffect(() => {
    const savedReservations = localStorage.getItem('reservations');
    if (savedReservations) {
      try {
        const parsed = JSON.parse(savedReservations) as ParsedReservation[];
        const reservations = parsed.map(res => ({
          ...res,
          selectedDate: res.selectedDate ? new Date(res.selectedDate) : null
        }));
        setConfirmedReservations(reservations);
      } catch (error) {
        console.error('Failed to parse saved reservations:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/calendar/availability');
        if (response.ok) {
          const events: ParsedEvent[] = await response.json();
          setExistingEvents(events);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching events:', error.message);
        }
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const isTimeSlotAvailable = (date: Date, timeSlot: string) => {
    // 車検の場合は1日2件までの制限のみをチェック
    if (formData.service === '車検') {
      const inspectionsForDay = existingEvents.filter(event => {
        const eventDate = new Date(event.start);
        return isSameDay(eventDate, date) && event.title?.includes('車検');
      });
      return inspectionsForDay.length < 2;
    }

    const config = SERVICE_CONFIG[formData.service as ServiceType];
    if (!config?.requiresTimeSlot) return true;

    const [hour, minute] = timeSlot.split(':');
    const slotStart = new Date(date);
    slotStart.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + config.duration);

    // その日のサービス予約数をチェック
    if (config.maxPerDay) {
      const servicesForDay = existingEvents.filter(event => {
        const eventDate = new Date(event.start);
        return isSameDay(eventDate, date) && event.title?.includes(formData.service);
      });
      if (servicesForDay.length >= config.maxPerDay) return false;
    }

    // 時間枠の重複チェック
    return !existingEvents.some(event => {
      if (!event.start || !event.end) return false;
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // 予約時間枠が重複していないかチェック
      return (
        (slotStart >= eventStart && slotStart < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (slotStart <= eventStart && slotEnd >= eventEnd)
      );
    });
  };

  // 郵便番号による住所検索関数
  const fetchAddress = async (postalCode: string) => {
    if (postalCode.length === 7) {
      try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
        const data = await response.json();
        if (data.results) {
          const result = data.results[0];
          const address = `${result.address1}${result.address2}${result.address3}`;
          setFormData(prev => ({ ...prev, address }));
        }
      } catch (error) {
        console.error('郵便番号検索エラー:', error);
      }
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">
        港南自動車予約サイト
      </h1>

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-4">お客様区分を選択</h2>
              <div className="flex gap-2 mb-4">
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600" 
                  onClick={() => { setCustomerType("new"); setStep(2); }}
                >
                  新規客
                </Button>
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600" 
                  onClick={() => { setCustomerType("existing"); setStep(2); }}
                >
                  既存客
                </Button>
                <Button 
                  className="flex-1 bg-purple-500 hover:bg-purple-600" 
                  onClick={() => { setCustomerType("lease"); setStep(2); }}
                >
                  リース客
                </Button>
              </div>
              <Button 
                className="w-full bg-gray-500 hover:bg-gray-600" 
                onClick={() => setStep(7)}
              >
                予約履歴を確認
              </Button>
            </div>
          )}

          {step === 7 && (
            <div>
              <h2 className="text-xl font-bold mb-4">予約履歴</h2>
              {confirmedReservations.length === 0 ? (
                <p>予約履歴がありません。</p>
              ) : (
                <ul className="list-disc pl-5">
                  {confirmedReservations.map((res, index) => (
                    <li key={index} className="mb-2">
                      {res.service} - {res.selectedDate && format(res.selectedDate, "yyyy/MM/dd")} {res.selectedTime}
                    </li>
                  ))}
                </ul>
              )}
              <Button className="mt-4" onClick={() => setStep(1)}>トップ画面に戻る</Button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-4">お客様情報入力</h2>
              {customerType === "lease" ? (
                <>
                  <input type="text" placeholder="会社名" className="block w-full p-2 mb-2 border" onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
                  <input type="text" placeholder="登録番号（4桁）" className="block w-full p-2 mb-2 border" onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} />
                </>
              ) : customerType === "new" ? (
                <>
                  <input 
                    type="text" 
                    placeholder="フルネーム" 
                    className="block w-full p-2 mb-2 border" 
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                  />
                  <input 
                    type="tel"
                    placeholder="電話番号" 
                    className="block w-full p-2 mb-2 border" 
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9-]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                      setFormData({ ...formData, phone: value });
                    }} 
                  />
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="tel"
                      placeholder="郵便番号（ハイフンなし）" 
                      className="block w-1/2 p-2 border"
                      maxLength={7}
                      value={formData.postalCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                        setFormData({ ...formData, postalCode: value });
                        fetchAddress(value);
                      }} 
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="住所" 
                    className="block w-full p-2 mb-2 border" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  />
                  <input 
                    type="text" 
                    placeholder="車種" 
                    className="block w-full p-2 mb-2 border" 
                    onChange={(e) => setFormData({ ...formData, carModel: e.target.value })} 
                  />
                  <div className="flex gap-2 mb-2">
                    <select 
                      className="p-2 border"
                      value={formData.yearEra}
                      onChange={(e) => setFormData({ ...formData, yearEra: e.target.value as "令和" | "平成" })}
                    >
                      <option value="令和">令和</option>
                      <option value="平成">平成</option>
                    </select>
                    <input 
                      type="tel"
                      placeholder="年数" 
                      className="block w-20 p-2 border" 
                      maxLength={2}
                      value={formData.yearNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                        setFormData({ ...formData, yearNumber: value });
                      }} 
                    />
                    <span className="flex items-center">年</span>
                  </div>
                </>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="お名前" 
                    className="block w-full p-2 mb-2 border" 
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                  />
                  <input 
                    type="text" 
                    placeholder="登録番号（4桁）" 
                    className="block w-full p-2 mb-2 border" 
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} 
                  />
                  <textarea 
                    placeholder="車の気になる点（任意）" 
                    className="block w-full p-2 mb-2 border" 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  ></textarea>
                </>
              )}
              <div className="flex justify-between">
                <Button className="bg-gray-500 hover:bg-gray-600" onClick={() => setStep(1)}>戻る</Button>
                <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setStep(3)}>次へ</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-4">サービス選択</h2>
              
              <h3 className="text-lg font-bold mb-2 text-blue-600">【点検メニュー】</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <Button 
                    className="block w-full bg-indigo-500 hover:bg-indigo-600" 
                    onClick={() => { setFormData({ ...formData, service: "車検" }); setStep(4); }}
                  >
                    車検
                  </Button>
                  <p className="text-base text-gray-700 mt-1 ml-2">作業時間は1日です。車両の納車は翌日になります。</p>
                </div>

                <div>
                  <Button 
                    className="block w-full bg-indigo-500 hover:bg-indigo-600" 
                    onClick={() => { setFormData({ ...formData, service: "12ヵ月点検" }); setStep(4); }}
                  >
                    12ヵ月点検
                  </Button>
                  <p className="text-base text-gray-700 mt-1 ml-2">作業時間は約1時間30分です。</p>
                </div>

                <div>
                  <Button 
                    className="block w-full bg-indigo-500 hover:bg-indigo-600" 
                    onClick={() => { setFormData({ ...formData, service: "6ヵ月点検(貨物車)" }); setStep(4); }}
                  >
                    6ヵ月点検(貨物車)
                  </Button>
                  <p className="text-base text-gray-700 mt-1 ml-2">作業時間は約1時間30分です。</p>
                </div>

                <div>
                  <Button 
                    className="block w-full bg-indigo-500 hover:bg-indigo-600" 
                    onClick={() => { setFormData({ ...formData, service: "スケジュール点検" }); setStep(4); }}
                  >
                    スケジュール点検
                  </Button>
                  <p className="text-base text-gray-700 mt-1 ml-2">作業時間は約1時間です。</p>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 text-blue-600">【ピットメニュー】</h3>
              <div className="space-y-4">
                <div>
                  <Button 
                    className="block w-full bg-indigo-500 hover:bg-indigo-600" 
                    onClick={() => { setFormData({ ...formData, service: "オイル交換" }); setStep(4); }}
                  >
                    オイル交換
                  </Button>
                  <p className="text-base text-gray-700 mt-1 ml-2">作業時間は約30分です。</p>
                </div>

                <div>
                  <Button 
                    className="block w-full bg-indigo-500 hover:bg-indigo-600" 
                    onClick={() => { setFormData({ ...formData, service: "タイヤ交換" }); setStep(4); }}
                  >
                    タイヤ交換
                  </Button>
                  <p className="text-base text-gray-700 mt-1 ml-2">作業時間は約30分です。</p>
                </div>
              </div>
              <Button className="mt-6 bg-gray-500 hover:bg-gray-600" onClick={() => setStep(2)}>戻る</Button>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-4">日時選択</h2>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <Button 
                    onClick={prevMonth}
                    disabled={currentMonth <= today}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    前月
                  </Button>
                  <h3 className="text-lg font-bold">
                    {format(currentMonth, 'yyyy年M月', { locale: ja })}
                  </h3>
                  <Button 
                    onClick={nextMonth}
                    disabled={currentMonth >= addDays(today, 90)}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    次月
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                  {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                    <div key={day} className={`font-bold ${day === '日' ? 'text-red-500' : day === '土' ? 'text-blue-500' : ''}`}>
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {generateCalendarGrid(currentMonth).map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} className="p-2" />;
                    
                    const isPast = day < today;
                    const isUnavailable = day > addDays(today, 90);
                    const isClosed = isClosedDay(day);
                    
                    return (
                      <button
                        key={format(day, "yyyy-MM-dd")}
                        className={`p-2 border rounded ${
                          isPast || isUnavailable || isClosed
                            ? "bg-gray-300 cursor-not-allowed"
                            : formData.selectedDate && isSameDay(formData.selectedDate, day)
                            ? "bg-blue-500 text-white"
                            : "bg-blue-100 hover:bg-blue-300"
                        }`}
                        disabled={isPast || isUnavailable || isClosed}
                        onClick={() => setFormData({ ...formData, selectedDate: day })}
                      >
                        {format(day, "d", { locale: ja })}
                      </button>
                    );
                  })}
                </div>
              </div>
              {formData.selectedDate && (
                <div>
                  <h3 className="text-lg font-bold mb-2">時間を選択</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {generateTimeSlots(formData.selectedDate).map((time) => {
                      const isAvailable = isTimeSlotAvailable(formData.selectedDate!, time);
                      return (
                        <button
                          key={time}
                          className={`p-2 border rounded ${
                            formData.selectedTime === time 
                              ? "bg-green-300"
                              : isAvailable
                              ? "bg-blue-100 hover:bg-blue-300"
                              : "bg-gray-300 cursor-not-allowed"
                          }`}
                          onClick={() => isAvailable && setFormData({ ...formData, selectedTime: time })}
                          disabled={!isAvailable}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {generateTimeSlots(formData.selectedDate).length === 0 && (
                    <p className="text-red-500">この日は予約可能な時間帯がありません。</p>
                  )}
                </div>
              )}
              <div className="flex justify-between mt-4">
                <Button onClick={() => setStep(3)}>戻る</Button>
                <Button onClick={() => setStep(5)} disabled={!formData.selectedDate || !formData.selectedTime}>次へ</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold mb-4">予約確認</h2>
              <ul className="list-disc pl-5">
                <li>名前/会社名: {formData.companyName || formData.fullName}</li>
                {formData.phone && <li>電話番号: {formData.phone}</li>}
                {formData.address && <li>住所: {formData.address}</li>}
                {formData.carModel && <li>車種: {formData.carModel}</li>}
                {formData.yearNumber && <li>年式: {formData.yearEra}{formData.yearNumber}年</li>}
                <li>サービス: {formData.service}</li>
                <li>予約日時: {formData.selectedDate ? format(formData.selectedDate, "yyyy/MM/dd") : "未選択"}</li>
                <li>時間: {formData.selectedTime}</li>
              </ul>
              <div className="flex justify-between mt-4">
                <Button onClick={() => setStep(4)}>戻る</Button>
                <Button onClick={handleConfirmReservation}>予約確定</Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="text-xl font-bold text-green-600">予約完了しました！</h2>
              <h3 className="text-lg font-bold mt-4">予約内容:</h3>
              <ul className="list-disc pl-5">
                <li>名前/会社名: {formData.companyName || formData.fullName}</li>
                <li>サービス: {formData.service}</li>
                <li>予約日時: {formData.selectedDate ? format(formData.selectedDate, "yyyy/MM/dd") : "未選択"}</li>
                <li>時間: {formData.selectedTime}</li>
              </ul>
              <a
                href={addToGoogleCalendar(formData)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Googleカレンダーに追加
              </a>
              <Button className="mt-4 ml-4" onClick={() => setStep(1)}>トップ画面へ戻る</Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
