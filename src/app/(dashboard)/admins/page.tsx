"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Loader2, Pencil, Trash2, MoreHorizontal, Link2, UserCog } from "lucide-react";
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
  roles: string[];
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
    phone: "",
  });

  // 초대 링크 상태
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({ name: "", email: "" });
  const [isInviting, setIsInviting] = useState(false);

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
    setInviteUrl(null);
    setInviteData({ name: "", email: "" });
    setShowInviteDialog(true);
  }

  async function handleInvite() {
    if (!inviteData.name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "ADMIN",
          email: inviteData.email || undefined,
          metadata: { name: inviteData.name },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("초대 링크가 생성되었습니다.");
        setInviteUrl(data.inviteUrl);
      } else {
        toast.error(data.error || "초대 생성에 실패했습니다.");
      }
    } catch {
      toast.error("초대 생성에 실패했습니다.");
    } finally {
      setIsInviting(false);
    }
  }

  function openEditDialog(admin: Admin) {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
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

    if (!formData.name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingAdmin) {
        const updateData: Record<string, string> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };

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
          setFormData({ name: "", email: "", phone: "" });
        } else {
          toast.error(data.error || "관리자 수정에 실패했습니다.");
        }
      } else {
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
          setFormData({ name: "", email: "", phone: "" });
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

  async function handleToggleTrainerRole(admin: Admin) {
    const hasTrainerRole = admin.roles.includes("TRAINER");
    const method = hasTrainerRole ? "DELETE" : "POST";
    const action = hasTrainerRole ? "제거" : "추가";

    try {
      const response = await fetch(`/api/users/${admin.id}/roles`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "TRAINER" }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`트레이너 역할이 ${action}되었습니다.`);
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === admin.id ? { ...a, roles: data.user.roles } : a
          )
        );
      } else {
        toast.error(data.error || `역할 ${action}에 실패했습니다.`);
      }
    } catch {
      toast.error(`역할 ${action} 중 오류가 발생했습니다.`);
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
            <Link2 className="h-4 w-4 mr-2" />
            관리자 초대
          </Button>
        }
      />

      {/* 관리자 수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? "관리자 정보 수정" : "새 관리자 추가"}
              </DialogTitle>
              <DialogDescription>
                {editingAdmin
                  ? "관리자 정보를 수정합니다."
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

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">등록된 관리자가 없습니다.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow
                      key={admin.id}
                      className="cursor-pointer"
                      onClick={() => openEditDialog(admin)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.name}</span>
                          {admin.roles.includes("TRAINER") && (
                            <Badge variant="secondary" className="text-xs">트레이너</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{admin.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {admin.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {format(new Date(admin.createdAt), "yyyy.MM.dd", { locale: ko })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(admin); }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleToggleTrainerRole(admin); }}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              {admin.roles.includes("TRAINER") ? "트레이너 역할 제거" : "트레이너 역할 추가"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); openDeleteDialog(admin); }}
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 초대 링크 생성 다이얼로그 */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) {
          setInviteUrl(null);
          setInviteData({ name: "", email: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 초대</DialogTitle>
            <DialogDescription>
              초대 링크를 생성하여 새 관리자를 등록합니다.
            </DialogDescription>
          </DialogHeader>
          {inviteUrl ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                아래 링크를 관리자에게 전달해주세요:
              </p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    toast.success("링크가 복사되었습니다.");
                  }}
                >
                  복사
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                이 링크는 30일간 유효하며 1회만 사용 가능합니다.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">이름 *</Label>
                  <Input
                    id="invite-name"
                    value={inviteData.name}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, name: e.target.value })
                    }
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">이메일</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, email: e.target.value })
                    }
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteDialog(false)}
                >
                  취소
                </Button>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? "생성 중..." : "초대 링크 생성"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>관리자 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {adminToDelete && (
                  <div className="p-3 bg-muted rounded-none">
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
