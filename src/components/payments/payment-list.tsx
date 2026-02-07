"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Loader2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>회원</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>PT 횟수</TableHead>
            <TableHead>금액</TableHead>
            <TableHead>날짜</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">결제 내역이 없습니다.</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>회원</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>PT 횟수</TableHead>
            <TableHead>금액</TableHead>
            <TableHead>날짜</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} className="group">
              <TableCell>
                <Link href={`/members/${payment.memberProfile.id}`} className="font-medium hover:underline">
                  {payment.memberProfile.user.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge
                  variant={payment.status === "COMPLETED" ? "default" : "destructive"}
                >
                  {statusLabels[payment.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">{payment.ptCount}회</span>
              </TableCell>
              <TableCell>
                <span className="font-medium">
                  {payment.amount.toLocaleString()}원
                </span>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {new Date(payment.paidAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => openDeleteDialog(payment)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
