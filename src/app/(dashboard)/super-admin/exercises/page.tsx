"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  type: string;
  category: string | null;
  equipment: string | null;
  isSystem: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_LABELS: Record<string, string> = {
  WEIGHT: "중량",
  CARDIO: "유산소",
  BODYWEIGHT: "맨몸",
};

const CATEGORIES = [
  "하체",
  "가슴",
  "등",
  "어깨",
  "팔",
  "복근",
  "유산소",
  "역도",
  "기타",
];

const EQUIPMENTS = [
  "바벨",
  "덤벨",
  "맨몸",
  "머신",
  "케틀벨",
  "이지바",
  "기타",
];

function getDefaultType(category: string, equipment: string): string {
  if (category === "유산소") return "CARDIO";
  if (equipment === "맨몸") return "BODYWEIGHT";
  return "WEIGHT";
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formEquipment, setFormEquipment] = useState("");
  const [formType, setFormType] = useState("WEIGHT");

  const fetchExercises = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (search) params.set("search", search);
        if (filterCategory) params.set("category", filterCategory);
        if (filterEquipment) params.set("equipment", filterEquipment);

        const res = await fetch(`/api/super-admin/exercises?${params}`);
        const data = await res.json();
        if (res.ok) {
          setExercises(data.exercises);
          setPagination(data.pagination);
        }
      } catch {
        toast.error("운동 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    },
    [search, filterCategory, filterEquipment]
  );

  useEffect(() => {
    fetchExercises(1);
  }, [fetchExercises]);

  const openCreateDialog = () => {
    setEditingExercise(null);
    setFormName("");
    setFormCategory("하체");
    setFormEquipment("바벨");
    setFormType("WEIGHT");
    setDialogOpen(true);
  };

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormName(exercise.name);
    setFormCategory(exercise.category || "기타");
    setFormEquipment(exercise.equipment || "기타");
    setFormType(exercise.type);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCategory || !formEquipment) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      if (editingExercise) {
        // Update
        const res = await fetch(
          `/api/super-admin/exercises/${editingExercise.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formName.trim(),
              type: formType,
              category: formCategory,
              equipment: formEquipment,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error);
          return;
        }
        toast.success("운동이 수정되었습니다.");
      } else {
        // Create
        const res = await fetch("/api/super-admin/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            category: formCategory,
            equipment: formEquipment,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error);
          return;
        }
        toast.success("운동이 추가되었습니다.");
      }
      setDialogOpen(false);
      fetchExercises(pagination.page);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/exercises/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("운동이 삭제되었습니다.");
      fetchExercises(pagination.page);
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
      setDeleteId(null);
    }
  };

  // Auto-set type when category/equipment changes
  const handleCategoryChange = (val: string) => {
    setFormCategory(val);
    setFormType(getDefaultType(val, formEquipment));
  };

  const handleEquipmentChange = (val: string) => {
    setFormEquipment(val);
    setFormType(getDefaultType(formCategory, val));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">운동 관리</h1>
          <p className="text-muted-foreground">
            시스템 운동 목록을 관리합니다 ({pagination.total}개)
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          운동 추가
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="운동 이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEquipment} onValueChange={setFilterEquipment}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="도구" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 도구</SelectItem>
            {EQUIPMENTS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>운동명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>도구</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : exercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Dumbbell className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {search || filterCategory || filterEquipment
                          ? "검색 결과가 없습니다."
                          : "등록된 운동이 없습니다."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">
                      {exercise.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{exercise.category || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {exercise.equipment || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TYPE_LABELS[exercise.type] || exercise.type}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(exercise)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteId(exercise.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} /{" "}
            {pagination.total}개
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchExercises(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchExercises(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? "운동 수정" : "운동 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>운동명</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="운동 이름 입력"
              />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={formCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>도구</Label>
              <Select
                value={formEquipment}
                onValueChange={handleEquipmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="도구 선택" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENTS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>입력 유형</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEIGHT">중량 (kg + 횟수)</SelectItem>
                  <SelectItem value="CARDIO">유산소 (시간)</SelectItem>
                  <SelectItem value="BODYWEIGHT">맨몸 (횟수)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : editingExercise ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>운동 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 운동을 삭제하시겠습니까? 기록이 있는 운동은 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
