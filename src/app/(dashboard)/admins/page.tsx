"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { UserPlus, Shield, Loader2, Mail, Phone, Calendar, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 현재 사용자 ID (자기 자신 삭제 방지용)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 수정 모드
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  // 삭제 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  useEffect(() => {
    fetchAdmins();
    fetchCurrentUser();
  }, []);

  async function fetchCurrentUser() {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data?.user?.id || null);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  }

  async function fetchAdmins() {
    try {
      const response = await fetch("/api/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("관리자 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingAdmin(null);
    setFormData({ name: "", email: "", password: "", phone: "" });
    setIsDialogOpen(true);
  }

  function openEditDialog(admin: Admin) {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "",
      phone: admin.phone || "",
    });
    setIsDialogOpen(true);
  }

  function openDeleteDialog(admin: Admin) {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingAdmin) {
        // 수정 모드
        const updateData: Record<string, string> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await fetch(`/api/admins/${editingAdmin.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("관리자 정보가 수정되었습니다.");
          setAdmins((prev) =>
            prev.map((a) => (a.id === editingAdmin.id ? data.admin : a))
          );
          setIsDialogOpen(false);
          setEditingAdmin(null);
          setFormData({ name: "", email: "", password: "", phone: "" });
        } else {
          toast.error(data.error || "관리자 수정에 실패했습니다.");
        }
      } else {
        // 생성 모드
        const response = await fetch("/api/admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("관리자가 추가되었습니다.");
          setAdmins((prev) => [data, ...prev]);
          setIsDialogOpen(false);
          setFormData({ name: "", email: "", password: "", phone: "" });
        } else {
          toast.error(data.error || "관리자 추가에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("Error saving admin:", error);
      toast.error("관리자 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!adminToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admins/${adminToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("관리자가 삭제되었습니다.");
        setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id));
        setDeleteDialogOpen(false);
        setAdminToDelete(null);
      } else {
        toast.error(data.error || "관리자 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("관리자 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="관리자 관리"
        description="시스템 관리자를 관리합니다."
        customAction={
          <Button onClick={openCreateDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            관리자 추가
          </Button>
        }
      />

      {/* 관리자 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? "관리자 정보 수정" : "새 관리자 추가"}
              </DialogTitle>
              <DialogDescription>
                {editingAdmin
                  ? "관리자 정보를 수정합니다. 비밀번호는 변경 시에만 입력하세요."
                  : "새로운 관리자 계정을 생성합니다."}
              </DialogDescription>
            </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="홍길동"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일 *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      비밀번호 {editingAdmin ? "(변경 시에만 입력)" : "*"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={editingAdmin ? "변경하지 않으려면 비워두세요" : "최소 8자 이상"}
                      required={!editingAdmin}
                      minLength={formData.password ? 8 : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="010-1234-5678"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingAdmin ? "저장 중..." : "추가 중..."}
                      </>
                    ) : (
                      editingAdmin ? "저장" : "추가"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            관리자 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead className="hidden sm:table-cell">연락처</TableHead>
                    <TableHead className="hidden sm:table-cell">등록일</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground hidden sm:inline" />
                          <span className="text-sm">{admin.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {admin.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{admin.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(admin.createdAt), "yyyy.MM.dd", {
                            locale: ko,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(admin)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(admin)}
                              disabled={admin.id === currentUserId}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              등록된 관리자가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>관리자 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {adminToDelete && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">{adminToDelete.name}</p>
                    <p className="text-sm">{adminToDelete.email}</p>
                  </div>
                )}
                <p>이 관리자를 삭제하시겠습니까?</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  삭제된 관리자 계정은 복구할 수 없습니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
