"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Loader2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Payment {
  id: string;
  amount: number;
  ptCount: number;
  status: string;
  description: string | null;
  paidAt: string;
  memberProfile: {
    id: string;
    user: { name: string };
  };
}

interface PaymentListProps {
  payments: Payment[];
}

const statusLabels: Record<string, string> = {
  COMPLETED: "완료",
  REFUNDED: "환불",
};

export function PaymentList({ payments: initialPayments }: PaymentListProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);

  function openDeleteDialog(payment: Payment) {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!selectedPayment) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("결제 내역이 삭제되었습니다.");
        setPayments(payments.filter((p) => p.id !== selectedPayment.id));
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "결제 삭제에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSelectedPayment(null);
    }
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
        결제 내역이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/50">
        {payments.map((payment) => (
          <Link
            key={payment.id}
            href={`/members/${payment.memberProfile.id}`}
            className="flex items-center gap-4 px-4 py-4 hover:bg-accent/30 transition-colors cursor-pointer"
          >
            {/* 아이콘 */}
            <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              payment.status === "COMPLETED" ? "bg-primary/10" : "bg-destructive/10"
            }`}>
              <CreditCard className={`h-6 w-6 ${
                payment.status === "COMPLETED" ? "text-primary" : "text-destructive"
              }`} />
            </div>

            {/* 정보 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[17px] font-semibold text-foreground truncate">
                  {payment.memberProfile.user.name}
                </p>
                <Badge
                  variant={payment.status === "COMPLETED" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {statusLabels[payment.status]}
                </Badge>
              </div>
              <p className="text-[15px] text-muted-foreground">
                PT {payment.ptCount}회
              </p>
              {payment.description && (
                <p className="text-[13px] text-muted-foreground/70 mt-0.5 truncate">
                  {payment.description}
                </p>
              )}
            </div>

            {/* 오른쪽: 금액, 날짜, 삭제 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-[17px] font-semibold">
                  ₩{payment.amount.toLocaleString()}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {new Date(payment.paidAt).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDeleteDialog(payment);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Link>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>결제 내역을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPayment && (
                <>
                  <strong>{selectedPayment.memberProfile.user.name}</strong>님의{" "}
                  <strong>PT {selectedPayment.ptCount}회</strong> 결제 내역(₩
                  {selectedPayment.amount.toLocaleString()})을 삭제합니다.
                  <br />
                  <span className="text-destructive font-medium">
                    삭제 시 해당 회원의 잔여 PT {selectedPayment.ptCount}회가 차감됩니다.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
