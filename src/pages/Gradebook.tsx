@@ .. @@
 export function Gradebook() {
   const [grades, setGrades] = useState<Grade[]>([]);
   const [loading, setLoading] = useState(true);
  const [overallGrade, setOverallGrade] = useState(0);
 }
+  const [overallGrade, setOverallGrade] = useState(0);
   const { user } = useAuthStore();
 
   useEffect(() => {
   }
   )
@@ .. @@
   const overallGrade = calculateOverallGrade();
 
   return (
     <div>
       <h1 className="text-3xl font-bold gradient-text mb-8">Gradebook</h1>
 
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="glass-effect rounded-lg p-6">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-gray-400">Overall Grade</p>
-              <p className={`text-3xl font-bold ${getGradeColor(calculateOverallGrade())}`}>
+              <p className={`text-3xl font-bold ${getGradeColor(overallGrade)}`}>
                 {overallGrade.toFixed(1)}%
               </p>
             </div>
   )
   )