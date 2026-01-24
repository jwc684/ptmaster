"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Loader2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <p className="text-sm text-muted-foreground text-center py-8">
        결제 내역이 없습니다.
      </p>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block -mx-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>회원</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>PT 횟수</TableHead>
              <TableHead>결제금액</TableHead>
              <TableHead>결제일</TableHead>
              <TableHead>비고</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <Link
                    href={`/members/${payment.memberProfile.id}`}
                    className="font-medium hover:underline"
                  >
                    {payment.memberProfile.user.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={payment.status === "COMPLETED" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {statusLabels[payment.status]}
                  </Badge>
                </TableCell>
                <TableCell>PT {payment.ptCount}회</TableCell>
                <TableCell className="font-medium">
                  ₩{payment.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(payment.paidAt).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell className="max-w-[150px]">
                  {payment.description ? (
                    <span className="text-muted-foreground text-sm truncate block">
                      {payment.description}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => openDeleteDialog(payment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center gap-3 py-3 border-b last:border-0"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/members/${payment.memberProfile.id}`}
                  className="font-medium hover:underline"
                >
                  {payment.memberProfile.user.name}
                </Link>
                <Badge
                  variant={payment.status === "COMPLETED" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {statusLabels[payment.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                PT {payment.ptCount}회
                {payment.description && ` - ${payment.description}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(payment.paidAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-right">
                ₩{payment.amount.toLocaleString()}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => openDeleteDialog(payment)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
