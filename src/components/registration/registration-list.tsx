"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    user: { name: string; phone: string | null };
    trainer: { user: { name: string } } | null;
  } | null;
}

interface RegistrationListProps {
  payments: Payment[];
}

export function RegistrationList({ payments: initialPayments }: RegistrationListProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);

  // 수정 다이얼로그 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    amount: 0,
    ptCount: 1,
    description: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  // 삭제 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openEditDialog(payment: Payment) {
    setSelectedPayment(payment);
    setEditForm({
      amount: payment.amount,
      ptCount: payment.ptCount,
      description: payment.description || "",
    });
    setEditDialogOpen(true);
  }

  function openDeleteDialog(payment: Payment) {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  }

  async function handleEdit() {
    if (!selectedPayment) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: editForm.amount,
          ptCount: editForm.ptCount,
          description: editForm.description,
        }),
      });

      if (res.ok) {
        toast.success("PT 등록 정보가 수정되었습니다.");
        setPayments(payments.map((p) =>
          p.id === selectedPayment.id
            ? { ...p, ...editForm }
            : p
        ));
        setEditDialogOpen(false);
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "수정에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedPayment) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("PT 등록이 삭제되었습니다.");
        setPayments(payments.filter((p) => p.id !== selectedPayment.id));
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "삭제에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (payments.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>회원</TableHead>
            <TableHead>PT 횟수</TableHead>
            <TableHead>금액</TableHead>
            <TableHead>트레이너</TableHead>
            <TableHead>날짜</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">등록된 내역이 없습니다.</p>
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
            <TableHead>PT 횟수</TableHead>
            <TableHead>금액</TableHead>
            <TableHead className="hidden sm:table-cell">트레이너</TableHead>
            <TableHead className="hidden sm:table-cell">날짜</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} className="group">
              <TableCell>
                <div>
                  {payment.memberProfile ? (
                    <Link href={`/members/${payment.memberProfile.id}`} className="font-medium hover:underline">
                      {payment.memberProfile.user.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">삭제된 회원</span>
                  )}
                  <div className="sm:hidden text-xs text-muted-foreground">
                    {payment.memberProfile?.trainer?.user.name || ""}
                    {payment.memberProfile?.trainer && " · "}
                    {new Date(payment.paidAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="default" className="text-xs">
                  {payment.ptCount}회
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-medium">
                  {payment.amount.toLocaleString()}원
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="text-muted-foreground">
                  {payment.memberProfile?.trainer?.user.name || "-"}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="text-muted-foreground">
                  {new Date(payment.paidAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(payment)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => openDeleteDialog(payment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PT 등록 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedPayment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedPayment.memberProfile?.user.name ?? "삭제된 회원"}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedPayment.paidAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>결제 금액</Label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm({ ...editForm, amount: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>PT 횟수</Label>
              <Input
                type="number"
                min={1}
                value={editForm.ptCount}
                onChange={(e) =>
                  setEditForm({ ...editForm, ptCount: parseInt(e.target.value) || 1 })
                }
              />
              {selectedPayment && editForm.ptCount !== selectedPayment.ptCount && (
                <p className="text-xs text-orange-600">
                  * PT 횟수 변경 시 회원의 잔여 PT도 자동 조정됩니다.
                  ({selectedPayment.ptCount}회 → {editForm.ptCount}회,
                  차이: {editForm.ptCount - selectedPayment.ptCount > 0 ? "+" : ""}
                  {editForm.ptCount - selectedPayment.ptCount}회)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="설명을 입력하세요"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={editLoading}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleEdit}
                disabled={editLoading}
                className="flex-1"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PT 등록을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPayment && (
                <>
                  <strong>{selectedPayment.memberProfile?.user.name ?? "삭제된 회원"}</strong>님의{" "}
                  <strong>PT {selectedPayment.ptCount}회</strong> 등록(₩
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
            <AlertDialogCancel disabled={deleteLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
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
